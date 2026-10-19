import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { establishmentAreaController } from '../controllers/establishmentArea.controller';

export const establishmentAreaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // 1. Dashboard
  fastify.get('/dashboard', establishmentAreaController.getDashboard);

  // 2. Profile, Photos, Hours
  fastify.get('/profile', establishmentAreaController.getProfile);
  fastify.put('/profile', establishmentAreaController.updateProfile);
  fastify.post('/photos', establishmentAreaController.addPhoto);
  fastify.delete('/photos', establishmentAreaController.removePhoto);
  fastify.get('/hours', establishmentAreaController.getWorkingHours);
  fastify.put('/hours', establishmentAreaController.updateWorkingHours);
  fastify.get('/species', establishmentAreaController.getAttendedSpecies);
  fastify.put('/species', establishmentAreaController.updateAttendedSpecies);

  // 3. Services
  fastify.get('/services', establishmentAreaController.listServices);
  fastify.post('/services', establishmentAreaController.createService);
  fastify.put('/services/:id', establishmentAreaController.updateService);
  fastify.delete('/services/:id', establishmentAreaController.deleteService);

  // 4. Products
  fastify.get('/products', establishmentAreaController.listProducts);
  fastify.post('/products', establishmentAreaController.createProduct);
  fastify.put('/products/:id', establishmentAreaController.updateProduct);
  fastify.delete('/products/:id', establishmentAreaController.deleteProduct);

  // 5. Employees
  fastify.get('/employees', establishmentAreaController.listEmployees);
  fastify.post('/employees', establishmentAreaController.createEmployee);
  fastify.put('/employees/:id', establishmentAreaController.updateEmployee);
  fastify.delete('/employees/:id', establishmentAreaController.deleteEmployee);

  // 6. Orders
  fastify.get('/orders', establishmentAreaController.listOrders);
  fastify.put('/orders/:id/status', establishmentAreaController.updateOrderStatus);
  fastify.post('/orders/:id/cancel', establishmentAreaController.cancelOrder);

  // 7. Appointments & Availability
  fastify.get('/appointments', establishmentAreaController.listAppointments);
  fastify.get('/availability', establishmentAreaController.getAvailability);
  fastify.put('/appointments/:id/status', establishmentAreaController.updateAppointmentStatus);
  fastify.put('/appointments/:id/payment', establishmentAreaController.registerPayment);
  fastify.post('/appointments/:id/payment', establishmentAreaController.registerPayment);
  fastify.put('/appointments/:id/assign-employee', establishmentAreaController.assignEmployeeToAppointment);

  // 8. Address Change Requests
  fastify.get('/address-request', establishmentAreaController.getAddressRequest);
  fastify.post('/address-request', establishmentAreaController.requestAddressChange);
};
