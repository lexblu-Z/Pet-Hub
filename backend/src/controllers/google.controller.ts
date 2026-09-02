import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Role } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

export const googleController = {
  // Generate auth URL
  async getAuthUrl(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== Role.ESTABLISHMENT) {
      return reply.status(403).send({ error: 'Apenas estabelecimentos podem integrar com Google Calendar.' });
    }

    // State will carry the establishment profile id
    const profile = await prisma.establishmentProfile.findUnique({ where: { userId: user.sub } });
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado.' });

    const state = profile.id;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${REDIRECT_URI}&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/calendar.events&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;

    return reply.send({ url: authUrl });
  },

  // OAuth callback
  async callback(request: FastifyRequest<{ Querystring: { code: string, state: string } }>, reply: FastifyReply) {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.status(400).send({ error: 'Parâmetros inválidos.' });
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const expiryDate = new Date(Date.now() + expires_in * 1000);

      // Save to database
      await prisma.oAuthIntegration.upsert({
        where: { establishmentProfileId: state },
        update: {
          accessToken: access_token,
          refreshToken: refresh_token || '', // Sometimes refresh token is only sent on first auth
          expiryDate,
        },
        create: {
          establishmentProfileId: state,
          provider: 'google',
          accessToken: access_token,
          refreshToken: refresh_token || '',
          expiryDate,
        }
      });

      // Redirect back to frontend success page
      return reply.redirect(process.env.FRONTEND_URL + '/estabelecimento?google_sync=success');
    } catch (error) {
      request.log.error(error);
      return reply.redirect(process.env.FRONTEND_URL + '/estabelecimento?google_sync=error');
    }
  }
};
