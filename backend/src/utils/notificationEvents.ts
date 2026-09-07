import { EventEmitter } from 'events';

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
