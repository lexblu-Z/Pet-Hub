import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { appointmentsController } from '../controllers/appointments.controller';

export const appointmentsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch (err) { reply.send(err); }
  });

  fastify.get('/me', appointmentsController.listForTutor);
  fastify.get('/provider', appointmentsController.listForProvider);
  fastify.post('/', appointmentsController.create);
  fastify.put('/:id/status', appointmentsController.updateStatus);
};
