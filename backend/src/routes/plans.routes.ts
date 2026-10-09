import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const plansRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Rejeita chamadas não autenticadas
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Autenticação necessária para simular ou contratar planos.' });
    }
  });

  // Rota de simulação protegida
  fastify.post('/simulate', async (request, reply) => {
    const user = (request as any).user;
    const { planId } = (request.body as { planId?: string }) || {};

    if (!planId) {
      return reply.status(400).send({ error: 'ID do plano não informado.' });
    }

    return reply.send({
      success: true,
      simulated: true,
      userId: user?.id,
      planId,
      message: 'Simulação de pagamento do plano autorizada com sucesso.',
      timestamp: new Date().toISOString(),
    });
  });
};
