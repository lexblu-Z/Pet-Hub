import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';

class NotificationEventEmitter extends EventEmitter {}

export const notificationEvents = new NotificationEventEmitter();
// Increase listener limit to prevent memory leak warnings with many concurrent users
notificationEvents.setMaxListeners(500);

export interface NotificationPayload {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export async function createAndEmitNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
}) {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
      },
    });
    notificationEvents.emit('notification', {
      id: notif.id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: notif.read,
      createdAt: notif.createdAt.toISOString(),
    });
    return notif;
  } catch (err) {
    console.error('Erro ao criar/emitir notificação:', err);
    return null;
  }
}
