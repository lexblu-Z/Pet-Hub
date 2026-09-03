import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { cashbackController } from '../controllers/cashback.controller';

export const cashbackRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch (err) { reply.send(err); }
  });

  fastify.get('/cashback/me', cashbackController.getMyCashback);
  fastify.post('/cashback/redeem', cashbackController.redeem);
};
