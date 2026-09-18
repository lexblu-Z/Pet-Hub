import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { partnerProgramController } from '../controllers/partner-program.controller.js';

export const partnerProgramRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Rotas para Estabelecimento
  fastify.get('/establishment/partner-program', partnerProgramController.getParticipation);
  fastify.post('/establishment/partner-program/opt-in', partnerProgramController.optIn);
  fastify.post('/establishment/partner-program/opt-out', partnerProgramController.optOut);
  fastify.get('/establishment/partner-program/payouts', partnerProgramController.getPayouts);

  // Rotas para Admin
  fastify.get('/admin/partner-program/overview', partnerProgramController.getAdminOverview);
  fastify.patch('/admin/partner-program/payouts/:id/status', partnerProgramController.updatePayoutStatus);
};
