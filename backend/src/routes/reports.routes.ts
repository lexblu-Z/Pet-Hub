import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { reportsController } from '../controllers/reports.controller';

export const reportsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado. Token inválido ou expirado.' });
    }
  });

  // ==========================================
  // ESTABELECIMENTO REPORTS
  // ==========================================
  fastify.get('/establishment/services', reportsController.getEstablishmentServices);
  fastify.get('/establishment/financial', reportsController.getEstablishmentFinancial);
  fastify.get('/establishment/customers', reportsController.getEstablishmentCustomers);
  fastify.get('/establishment/inventory', reportsController.getEstablishmentInventory);
  fastify.get('/establishment/export', reportsController.exportEstablishmentCsv);

  // ==========================================
  // PROFISSIONAL REPORTS
  // ==========================================
  fastify.get('/professional/services', reportsController.getProfessionalServices);
  fastify.get('/professional/financial', reportsController.getProfessionalFinancial);
  fastify.get('/professional/customers', reportsController.getProfessionalCustomers);
  fastify.get('/professional/export', reportsController.exportProfessionalCsv);
};
