import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { servicesController } from '../controllers/services.controller';

export const servicesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch (err) { reply.send(err); }
  });

  fastify.get('/', servicesController.list);
  fastify.post('/', servicesController.create);
  fastify.put('/:id', servicesController.update);
  fastify.delete('/:id', servicesController.delete);
};
