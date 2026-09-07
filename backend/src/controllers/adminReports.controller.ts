import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReportStatus, ReportPriority, ReportTargetType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logAdminAction } from '../utils/auditLogger';

const listQuerySchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  targetType: z.nativeEnum(ReportTargetType).optional(),
  priority: z.nativeEnum(ReportPriority).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  adminNotes: z.string().optional().nullable(),
  decisionReason: z.string().optional().nullable(),
  priority: z.nativeEnum(ReportPriority).optional(),
});

export const adminReportsController = {
  async listReports(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {};
      if (query.status) {
        where.status = query.status;
      }
      if (query.targetType) {
        where.targetType = query.targetType;
      }
      if (query.priority) {
        where.priority = query.priority;
      }
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }
      if (query.search) {
        where.OR = [
          { reason: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { reporter: { name: { contains: query.search, mode: 'insensitive' } } },
          { reportedUser: { name: { contains: query.search, mode: 'insensitive' } } },
          { reportedEstablishment: { businessName: { contains: query.search, mode: 'insensitive' } } },
        ];
      }

      const [reports, total] = await Promise.all([
        prisma.moderationReport.findMany({
          where,
          include: {
            reporter: {
              select: { id: true, name: true, email: true, role: true, avatar: true },
            },
            reportedUser: {
              select: { id: true, name: true, email: true, role: true, avatar: true },
            },
            reportedEstablishment: {
              select: { id: true, businessName: true, phone: true, email: true },
            },
            resolvedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        prisma.moderationReport.count({ where }),
      ]);

      const counts = await prisma.moderationReport.groupBy({
        by: ['status'],
        _count: { _all: true },
      });

      const statusCounts = {
        ALL: total,
        NOVA: 0,
        EM_ANALISE: 0,
        RESOLVIDA: 0,
        ARQUIVADA: 0,
      };

      counts.forEach((c) => {
        if (c.status in statusCounts) {
          (statusCounts as any)[c.status] = c._count._all;
        }
      });

      return reply.send({
        reports,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        counts: statusCounts,
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing moderation reports');
      return reply.status(400).send({ error: error.message || 'Erro ao listar denúncias.' });
    }
  },

  async getReportDetails(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const report = await prisma.moderationReport.findUnique({
        where: { id },
        include: {
          reporter: {
            select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, createdAt: true },
          },
          reportedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              avatar: true,
              createdAt: true,
              establishmentProfile: true,
              professionalProfile: true,
            },
          },
          reportedEstablishment: true,
          resolvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!report) {
        return reply.status(404).send({ error: 'Denúncia não encontrada.' });
      }

      return reply.send(report);
    } catch (error: any) {
      request.log.error(error, 'Error fetching report details');
      return reply.status(500).send({ error: 'Erro ao buscar detalhes da denúncia.' });
    }
  },

  async updateReportStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user as any;
      const data = updateStatusSchema.parse(request.body);

      const existingReport = await prisma.moderationReport.findUnique({
        where: { id },
      });

      if (!existingReport) {
        return reply.status(404).send({ error: 'Denúncia não encontrada.' });
      }

      const isResolvingOrArchiving = data.status === ReportStatus.RESOLVIDA || data.status === ReportStatus.ARQUIVADA;
      if (isResolvingOrArchiving && (!data.decisionReason || !data.decisionReason.trim())) {
        return reply.status(400).send({
          error: 'É obrigatório registrar o motivo da decisão ao resolver ou arquivar uma denúncia.',
        });
      }

      const updatePayload: any = {
        status: data.status,
        updatedAt: new Date(),
      };

      if (data.adminNotes !== undefined) updatePayload.adminNotes = data.adminNotes;
      if (data.decisionReason !== undefined) updatePayload.decisionReason = data.decisionReason;
      if (data.priority !== undefined) updatePayload.priority = data.priority;

      if (isResolvingOrArchiving) {
        updatePayload.resolvedById = user?.sub || null;
        updatePayload.resolvedAt = new Date();
      }

      const updatedReport = await prisma.moderationReport.update({
        where: { id },
        data: updatePayload,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          reportedUser: { select: { id: true, name: true, email: true } },
          reportedEstablishment: { select: { id: true, businessName: true } },
          resolvedBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAdminAction({
        adminId: user.sub,
        action: `REPORT_STATUS_${data.status}`,
        entity: 'ModerationReport',
        entityId: id,
        details: {
          previousStatus: existingReport.status,
          newStatus: data.status,
          decisionReason: data.decisionReason,
          adminNotes: data.adminNotes,
        },
        ipAddress: request.ip,
      });

      return reply.send(updatedReport);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error, 'Error updating report status');
      return reply.status(500).send({ error: 'Erro ao atualizar denúncia.' });
    }
  },
};
