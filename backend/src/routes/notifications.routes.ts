import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { notificationsController } from '../controllers/notifications.controller';

export const notificationsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get('/notifications', notificationsController.list);
  fastify.patch('/notifications/:id/read', notificationsController.markAsRead);
  fastify.patch('/notifications/read-all', notificationsController.markAllAsRead);
};
