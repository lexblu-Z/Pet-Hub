import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { petsController } from '../controllers/pets.controller';

export const petsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Ensure all pet routes are authenticated
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get('/', petsController.list);
  fastify.post('/', petsController.create);
  fastify.get('/:id', petsController.get);
  fastify.put('/:id', petsController.update);
  fastify.delete('/:id', petsController.delete);
};
