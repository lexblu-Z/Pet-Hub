import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logAdminAction } from '../utils/auditLogger';

const broadcastSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  message: z.string().min(5, 'A mensagem deve ter pelo menos 5 caracteres.'),
  audience: z.enum(['ALL', 'TUTORS', 'PROFESSIONALS', 'ESTABLISHMENTS', 'SPECIFIC']),
  userIds: z.array(z.string()).optional(),
  type: z.string().default('SYSTEM'),
});

export const adminNotificationsController = {
  async broadcast(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = broadcastSchema.parse(request.body);

      let targetUserIds: string[] = [];

      if (data.audience === 'ALL') {
        const users = await prisma.user.findMany({ select: { id: true } });
        targetUserIds = users.map((u) => u.id);
      } else if (data.audience === 'TUTORS') {
        const users = await prisma.user.findMany({
          where: { role: Role.TUTOR },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
      } else if (data.audience === 'PROFESSIONALS') {
        const users = await prisma.user.findMany({
          where: { role: Role.PROFESSIONAL },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
      } else if (data.audience === 'ESTABLISHMENTS') {
        const users = await prisma.user.findMany({
          where: { role: Role.ESTABLISHMENT },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
      } else if (data.audience === 'SPECIFIC') {
        if (!data.userIds || data.userIds.length === 0) {
          return reply.status(400).send({ error: 'Nenhum usuário especificado.' });
        }
        targetUserIds = data.userIds;
      }

      if (targetUserIds.length === 0) {
        return reply.status(400).send({ error: 'Nenhum destinatário encontrado para o público selecionado.' });
      }

      // Create notifications in batch
      const notificationsData = targetUserIds.map((userId) => ({
        userId,
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type || 'SYSTEM',
        read: false,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });

      // Emit realtime events to online connected clients immediately
      try {
        const { notificationEvents } = await import('../utils/notificationEvents');
        const createdNotifications = await prisma.notification.findMany({
          where: {
            userId: { in: targetUserIds },
            title: data.title.trim(),
          },
          orderBy: { createdAt: 'desc' },
          take: targetUserIds.length,
        });

        createdNotifications.forEach((notif) => {
          notificationEvents.emit('notification', notif);
        });
      } catch (evtErr) {
        request.log.warn(evtErr, 'Could not emit realtime notification events');
      }

      // Audit log
      await logAdminAction({
        adminId: user.sub,
        action: 'NOTIFICATION_BROADCAST',
        entity: 'Notification',
        details: {
          title: data.title,
          audience: data.audience,
          recipientsCount: targetUserIds.length,
        },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: `Notificação enviada com sucesso para ${targetUserIds.length} usuário(s).`,
        recipientsCount: targetUserIds.length,
        audience: data.audience,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error, 'Error broadcasting notification');
      return reply.status(500).send({ error: 'Erro ao disparar notificações.' });
    }
  },

  async listBroadcastHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const history = await prisma.adminAuditLog.findMany({
        where: { action: 'NOTIFICATION_BROADCAST' },
        include: {
          admin: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reply.send(history);
    } catch (error: any) {
      request.log.error(error, 'Error fetching notification history');
      return reply.status(500).send({ error: 'Erro ao buscar histórico de envios.' });
    }
  },
};
