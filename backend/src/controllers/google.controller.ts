import { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

const cleanEnv = (val?: string) => (val ? val.replace(/^["'\[]+|["'\]]+$/g, '').trim() : '');
const GOOGLE_CLIENT_ID = cleanEnv(process.env.GOOGLE_CLIENT_ID) || 'dummy_client_id';
const GOOGLE_CLIENT_SECRET = cleanEnv(process.env.GOOGLE_CLIENT_SECRET) || 'dummy_client_secret';
const REDIRECT_URI = cleanEnv(process.env.GOOGLE_REDIRECT_URI) || 'http://localhost:3000/api/google/callback';
const FRONTEND_URL = cleanEnv(process.env.FRONTEND_URL) || 'http://localhost:5173';

export const googleController = {
  // =========================================================================
  // 1. GENERATE AUTH URL (ANY AUTHENTICATED USER: TUTOR, PROF, ESTAB)
  // =========================================================================
  async getAuthUrl(request: FastifyRequest<{ Querystring: { returnTo?: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    if (!user || !user.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    const returnTo = request.query.returnTo || '/';
    const statePayload = {
      userId: user.sub,
      role: user.role,
      returnTo,
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const activeClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID) || GOOGLE_CLIENT_ID;
    const activeRedirectUri = cleanEnv(process.env.GOOGLE_REDIRECT_URI) || REDIRECT_URI;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(activeClientId)}&` +
      `redirect_uri=${encodeURIComponent(activeRedirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    return reply.send({ url: authUrl });
  },

  // =========================================================================
  // 2. OAUTH CALLBACK (PUBLIC ENDPOINT REDIRECTED BY GOOGLE)
  // =========================================================================
  async callback(
    request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
    reply: FastifyReply
  ) {
    const { code, state, error } = request.query;

    let parsedState: { userId: string; role?: string; returnTo?: string } = { userId: '', returnTo: '/' };
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      } catch {
        parsedState = { userId: '', returnTo: '/' };
      }
    }

    const fallbackUrl = parsedState.returnTo || '/';

    if (error || !code || !parsedState.userId) {
      request.log.error({ error, code, state }, 'Google OAuth callback error or rejected:');
      const target = fallbackUrl.includes('?')
        ? `${FRONTEND_URL}${fallbackUrl}&google_sync=error`
        : `${FRONTEND_URL}${fallbackUrl}?google_sync=error`;
      return reply.redirect(target);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = tokenRes.data;
      const expiryDate = new Date(Date.now() + (expires_in || 3600) * 1000);

      // Get Google user email
      let googleEmail = '';
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        googleEmail = userInfo.data.email || '';
      } catch {
        // Fallback: email not critical if failed
      }

      // Upsert connection for this user
      const existingConn = await prisma.googleCalendarConnection.findUnique({
        where: { userId: parsedState.userId },
      });

      const connection = await prisma.googleCalendarConnection.upsert({
        where: { userId: parsedState.userId },
        update: {
          accessToken: access_token,
          refreshToken: refresh_token || existingConn?.refreshToken || '',
          tokenExpiresAt: expiryDate,
          googleEmail: googleEmail || existingConn?.googleEmail || '',
          syncEnabled: true,
          lastSyncAt: new Date(),
        },
        create: {
          userId: parsedState.userId,
          accessToken: access_token,
          refreshToken: refresh_token || '',
          tokenExpiresAt: expiryDate,
          googleEmail: googleEmail || '',
          calendarId: 'primary',
          calendarName: 'Agenda Principal',
          syncEnabled: true,
          lastSyncAt: new Date(),
        },
      });

      await prisma.calendarSyncLog.create({
        data: {
          connectionId: connection.id,
          action: 'CONNECT',
          status: 'SUCCESS',
          title: 'Google Calendar conectado',
          details: `Conta ${googleEmail || 'Google'} vinculada com sucesso.`,
        },
      });

      // Synchronize active appointments automatically
      try {
        await googleCalendarService.syncAllPending(parsedState.userId);
      } catch (syncErr: any) {
        request.log.error('Initial auto-sync error:', syncErr.message);
      }

      const target = fallbackUrl.includes('?')
        ? `${FRONTEND_URL}${fallbackUrl}&google_sync=success`
        : `${FRONTEND_URL}${fallbackUrl}?google_sync=success`;
      return reply.redirect(target);
    } catch (err: any) {
      request.log.error('Failed to exchange Google OAuth code:', err.response?.data || err.message);
      const target = fallbackUrl.includes('?')
        ? `${FRONTEND_URL}${fallbackUrl}&google_sync=error`
        : `${FRONTEND_URL}${fallbackUrl}?google_sync=error`;
      return reply.redirect(target);
    }
  },

  // =========================================================================
  // 3. GET SAFE STATUS (NO SENSITIVE TOKENS EXPOSED)
  // =========================================================================
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.send({
        isConnected: false,
        googleEmail: null,
        calendarId: null,
        calendarName: null,
        syncEnabled: false,
        lastSyncAt: null,
      });
    }

    return reply.send({
      isConnected: true,
      googleEmail: connection.googleEmail,
      calendarId: connection.calendarId,
      calendarName: connection.calendarName,
      syncEnabled: connection.syncEnabled,
      lastSyncAt: connection.lastSyncAt,
    });
  },

  // =========================================================================
  // 4. LIST USER'S GOOGLE CALENDARS
  // =========================================================================
  async getCalendars(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.status(404).send({ error: 'Google Calendar não conectado.' });
    }

    try {
      const calendars = await googleCalendarService.listUserCalendars(connection);
      return reply.send(calendars);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao carregar calendários do Google.' });
    }
  },

  // =========================================================================
  // 5. SELECT TARGET CALENDAR
  // =========================================================================
  async selectCalendar(
    request: FastifyRequest<{ Body: { calendarId: string; calendarName?: string } }>,
    reply: FastifyReply
  ) {
    const user = request.user as any;
    const { calendarId, calendarName } = request.body || {};

    if (!calendarId) {
      return reply.status(400).send({ error: 'calendarId é obrigatório.' });
    }

    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.status(404).send({ error: 'Google Calendar não conectado.' });
    }

    const updated = await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        calendarId,
        calendarName: calendarName || (calendarId === 'primary' ? 'Agenda Principal' : calendarId),
        lastSyncAt: new Date(),
      },
    });

    // Run sync on new calendar
    googleCalendarService.syncAllPending(user.sub).catch(() => {});

    return reply.send({
      success: true,
      calendarId: updated.calendarId,
      calendarName: updated.calendarName,
    });
  },

  // =========================================================================
  // 6. CREATE DEDICATED PETHUB CALENDAR IN GOOGLE ACCOUNT
  // =========================================================================
  async createPetHubCalendar(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.status(404).send({ error: 'Google Calendar não conectado.' });
    }

    try {
      const created = await googleCalendarService.createDedicatedPetHubCalendar(connection);
      // Run sync on newly created calendar
      googleCalendarService.syncAllPending(user.sub).catch(() => {});
      return reply.send({ success: true, calendar: created });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao criar agenda PetHub no Google.' });
    }
  },

  // =========================================================================
  // 7. MANUAL SYNC NOW
  // =========================================================================
  async syncNow(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.status(404).send({ error: 'Google Calendar não conectado.' });
    }

    const result = await googleCalendarService.syncAllPending(user.sub);
    return reply.send({
      success: true,
      message: 'Sincronização realizada com sucesso!',
      result,
      lastSyncAt: new Date(),
    });
  },

  // =========================================================================
  // 8. GET SYNC LOGS
  // =========================================================================
  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.send([]);
    }

    const logs = await prisma.calendarSyncLog.findMany({
      where: { connectionId: connection.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return reply.send(logs);
  },

  // =========================================================================
  // 9. DISCONNECT & REVOKE
  // =========================================================================
  async disconnect(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.sub },
    });

    if (!connection) {
      return reply.send({ success: true, message: 'Já desconectado.' });
    }

    // Try to revoke on Google
    try {
      if (connection.accessToken) {
        await axios.post(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connection.accessToken)}`,
          null,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      }
    } catch {
      // Non-critical if token already revoked or expired
    }

    // Delete connection and cascade logs and event syncs
    await prisma.googleCalendarConnection.delete({
      where: { id: connection.id },
    });

    return reply.send({
      success: true,
      message: 'Google Calendar desconectado com sucesso.',
    });
  },
};
