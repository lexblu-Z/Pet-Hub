import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { notificationsController } from '../controllers/notifications.controller';

export const notificationsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const queryToken = (request.query as any)?.token;
      if (queryToken && !request.headers.authorization) {
        request.headers.authorization = `Bearer ${queryToken}`;
      }
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Token inválido ou expirado.' });
    }
  });

  fastify.get('/notifications', notificationsController.list);
  fastify.get('/notifications/stream', notificationsController.stream);
  fastify.patch('/notifications/:id/read', notificationsController.markAsRead);
  fastify.patch('/notifications/read-all', notificationsController.markAllAsRead);
};
