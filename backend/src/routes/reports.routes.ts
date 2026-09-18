import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReportTargetType, ReportStatus, ReportPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { reportsController } from '../controllers/reports.controller';

const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  reportedUserId: z.string().optional().nullable(),
  reportedEstablishmentId: z.string().optional().nullable(),
  reason: z.string().min(3, 'O motivo deve ter pelo menos 3 caracteres.'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
});

export const reportsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Você precisa estar autenticado para acessar os relatórios.' });
    }
  });

  // Moderation report
  fastify.post('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const data = createReportSchema.parse(request.body);

      if (!data.reportedUserId && !data.reportedEstablishmentId) {
        return reply.status(400).send({ error: 'Informe o usuário ou estabelecimento denunciado.' });
      }

      if (data.reportedUserId && data.reportedUserId === user.sub) {
        return reply.status(400).send({ error: 'Você não pode denunciar o seu próprio perfil.' });
      }

      let finalReportedUserId = data.reportedUserId || null;
      let finalEstablishmentId = data.reportedEstablishmentId || null;

      if (finalEstablishmentId && !finalReportedUserId) {
        const estab = await prisma.establishmentProfile.findFirst({
          where: { OR: [{ id: finalEstablishmentId }, { userId: finalEstablishmentId }] },
        });
        if (estab) {
          finalReportedUserId = estab.userId;
          finalEstablishmentId = estab.id;
        }
      }

      const report = await prisma.moderationReport.create({
        data: {
          reporterId: user.sub,
          reportedUserId: finalReportedUserId,
          reportedEstablishmentId: finalEstablishmentId,
          targetType: data.targetType,
          reason: data.reason.trim(),
          description: data.description.trim(),
          status: ReportStatus.NOVA,
          priority: ReportPriority.MEDIA,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Denúncia enviada com sucesso. Nossa equipe irá analisar o caso.',
        reportId: report.id,
        reportNumber: report.reportNumber,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error, 'Error creating profile report');
      return reply.status(500).send({ error: 'Erro ao processar sua denúncia. Tente novamente mais tarde.' });
    }
  });

  // Establishment reports (RF17 & Official PDF/CSV exports)
  fastify.get('/establishment/services', reportsController.getEstablishmentServices);
  fastify.get('/establishment/financial', reportsController.getEstablishmentFinancial);
  fastify.get('/establishment/customers', reportsController.getEstablishmentCustomers);
  fastify.get('/establishment/inventory', reportsController.getEstablishmentInventory);
  fastify.get('/establishment/export', reportsController.exportEstablishment);

  // Professional reports
  fastify.get('/professional/services', reportsController.getProfessionalServices);
  fastify.get('/professional/financial', reportsController.getProfessionalFinancial);
  fastify.get('/professional/customers', reportsController.getProfessionalCustomers);
  fastify.get('/professional/export', reportsController.exportProfessional);
};
