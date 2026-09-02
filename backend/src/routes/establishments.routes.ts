import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { establishmentsController } from '../controllers/establishments.controller';

export const establishmentsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Public route (might be protected by JWT, but any role can see)
  fastify.get(
    '/',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    establishmentsController.listPublic
  );

  // Admin routes
  fastify.get(
    '/pending',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    establishmentsController.listPending
  );

  fastify.put(
    '/:id/status',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    establishmentsController.updateStatus
  );
};
