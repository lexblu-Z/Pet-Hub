import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const auditQuerySchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  adminId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const adminAuditController = {
  async listLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = auditQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {};
      if (query.action) {
        where.action = { contains: query.action, mode: 'insensitive' };
      }
      if (query.entity) {
        where.entity = { contains: query.entity, mode: 'insensitive' };
      }
      if (query.adminId) {
        where.adminId = query.adminId;
      }
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.adminAuditLog.findMany({
          where,
          include: {
            admin: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.adminAuditLog.count({ where }),
      ]);

      return reply.send({
        logs,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing admin audit logs');
      return reply.status(500).send({ error: 'Erro ao buscar trilha de auditoria.' });
    }
  },
};
