
import { FastifyInstance } from 'fastify';
import { addToCart } from '../controllers/cart.controller';

export async function cartRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.post('/cart/items', addToCart);
}
