import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export const notificationsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send(notifications);
  },

  async markAsRead(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.sub },
    });

    if (!notification) {
      return reply.status(404).send({ error: 'Notificação não encontrada.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return reply.send(updated);
  },

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;

    await prisma.notification.updateMany({
      where: { userId: user.sub, read: false },
      data: { read: true },
    });

    return reply.send({ success: true });
  }
};
