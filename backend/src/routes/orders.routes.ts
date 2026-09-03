
import { FastifyInstance } from 'fastify';
import { listTutorOrders, getOrderById, createOrder } from '../controllers/orders.controller';

export async function ordersRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get('/orders', listTutorOrders);
  fastify.post('/orders', createOrder);
  fastify.get('/orders/:id', getOrderById);
}
