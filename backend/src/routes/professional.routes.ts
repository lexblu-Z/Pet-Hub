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

  // Services management
  fastify.get('/services', professionalController.listServices);
  fastify.post('/services', professionalController.createService);
  fastify.put('/services/:id', professionalController.updateService);
  fastify.delete('/services/:id', professionalController.deleteService);
  fastify.patch('/services/:id/toggle', professionalController.toggleServiceActive);

  // Availability & Booking Settings
  fastify.get('/availability', professionalController.getAvailability);
  fastify.put('/availability', professionalController.updateAvailability);
}
