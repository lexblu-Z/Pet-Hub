import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { productsController } from '../controllers/products.controller';

export const productsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Public route to view products
  fastify.get('/products', productsController.list);
  fastify.get('/products/:id', productsController.get);

  // Protected route to create product
  fastify.post('/products', {
    onRequest: [async (request, reply) => {
      try { await request.jwtVerify(); } catch (err) { reply.send(err); }
    }]
  }, productsController.create);
};
