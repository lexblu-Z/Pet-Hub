import { FastifyInstance } from 'fastify';
import { professionalController } from '../controllers/professional.controller';

export async function professionalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado. Token inválido ou expirado.' });
    }
  });

  fastify.get('/dashboard', professionalController.getDashboard);
  fastify.get('/appointments', professionalController.getAppointments);
  fastify.put('/appointments/:id/status', professionalController.updateAppointmentStatus);
  fastify.get('/work-orders', professionalController.getWorkOrders);
  fastify.get('/reviews', professionalController.getReviews);
}
