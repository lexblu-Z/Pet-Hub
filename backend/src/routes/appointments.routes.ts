import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { appointmentsController } from '../controllers/appointments.controller';

export const appointmentsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Publicly queryable slots (can be accessed with or without auth)
  fastify.get('/available-slots', appointmentsController.getAvailableSlots);

  // Authenticated routes
  fastify.register(async (authGroup) => {
    authGroup.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    authGroup.get('/me', appointmentsController.listForTutor);
    authGroup.get('/provider', appointmentsController.listForProvider);
    authGroup.post('/', appointmentsController.create);
    authGroup.put('/:id/status', appointmentsController.updateStatus);
    authGroup.post('/:id/confirm-completion', appointmentsController.confirmCompletion);
  });
};
