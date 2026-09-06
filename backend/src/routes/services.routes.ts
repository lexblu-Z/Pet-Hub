import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { servicesController } from '../controllers/services.controller';

export const servicesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', servicesController.list);

  // Protected mutation routes
  fastify.post(
    '/',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    servicesController.create
  );

  fastify.put(
    '/:id',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    servicesController.update
  );

  fastify.delete(
    '/:id',
    {
      onRequest: [async (request, reply) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
      }],
    },
    servicesController.delete
  );
};
