import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { googleController } from '../controllers/google.controller';

export const googleRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Callback is public (Google redirects here)
  fastify.get('/callback', googleController.callback);

  // Auth URL requires authentication
  fastify.get(
    '/auth-url',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    googleController.getAuthUrl
  );
};
