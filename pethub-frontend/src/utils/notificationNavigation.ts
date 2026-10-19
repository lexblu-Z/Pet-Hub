import type { UserRole } from '@/types';

export interface NotificationNavigationTarget {
  path: string;
  state?: Record<string, any>;
}

/**
 * Resolves the destination route and state for any notification,
 * respecting user roles, permissions and attached identifiers (appointmentId, orderId).
 */
export function resolveNotificationRoute(
  notif: any,
  currentRole: UserRole | string | null | undefined,
  currentUser: any
): NotificationNavigationTarget {
  // Normalize role to lowercase (handles 'TUTOR', 'ESTABLISHMENT', 'PROFESSIONAL', 'ADMIN' or 'tutor', 'estabelecimento', etc.)
  const rawRole = (currentRole || currentUser?.role || '').toString().toLowerCase();

  const appointmentId = notif?.appointmentId || notif?.metadata?.appointmentId || null;
  const orderId = notif?.metadata?.orderId || notif?.orderId || null;
  const type = String(notif?.type || '').toUpperCase();

  // Role: TUTOR
  if (rawRole === 'tutor') {
    if (type === 'APPOINTMENT') {
      if (appointmentId) {
        return {
          path: `/tutor/appointments?appointmentId=${encodeURIComponent(appointmentId)}`,
          state: { appointmentId },
        };
      }
      return { path: '/tutor/appointments' };
    }
    if (type === 'ORDER') {
      if (orderId) {
        return {
          path: `/tutor/compras?orderId=${encodeURIComponent(orderId)}`,
          state: { orderId },
        };
      }
      return { path: '/tutor/compras' };
    }
    if (type === 'CASHBACK') {
      return { path: '/tutor/cashback' };
    }
    if (type === 'MESSAGE') {
      return { path: '/tutor/chat' };
    }
    return { path: '/tutor/notifications' };
  }

  // Role: ESTABLISHMENT
  if (rawRole === 'estabelecimento' || rawRole === 'establishment') {
    if (type === 'APPOINTMENT') {
      if (appointmentId) {
        return {
          path: `/estabelecimento/agendamentos?appointmentId=${encodeURIComponent(appointmentId)}`,
          state: { appointmentId },
        };
      }
      return { path: '/estabelecimento/agendamentos' };
    }
    if (type === 'ORDER') {
      if (orderId) {
        return {
          path: `/estabelecimento/pedidos?orderId=${encodeURIComponent(orderId)}`,
          state: { orderId },
        };
      }
      return { path: '/estabelecimento/pedidos' };
    }
    if (type === 'MESSAGE') {
      return { path: '/estabelecimento/mensagens' };
    }
    return { path: '/estabelecimento/agendamentos' };
  }

  // Role: PROFESSIONAL
  if (rawRole === 'profissional' || rawRole === 'professional') {
    if (type === 'APPOINTMENT') {
      if (appointmentId) {
        return {
          path: `/profissional/agenda?appointmentId=${encodeURIComponent(appointmentId)}`,
          state: { appointmentId },
        };
      }
      return { path: '/profissional/agenda' };
    }
    if (type === 'MESSAGE') {
      return { path: '/profissional/agenda' };
    }
    return { path: '/profissional/agenda' };
  }

  // Role: ADMIN
  if (rawRole === 'admin') {
    if (type === 'APPOINTMENT') {
      if (appointmentId) {
        return {
          path: `/admin/agendamentos?appointmentId=${encodeURIComponent(appointmentId)}`,
          state: { appointmentId },
        };
      }
      return { path: '/admin/agendamentos' };
    }
    if (type === 'ORDER') {
      return { path: '/admin/financeiro' };
    }
    if (type === 'MODERATION' || type === 'REPORT') {
      return { path: '/admin/moderacao' };
    }
    return { path: '/admin' };
  }

  // Fallback for unauthenticated or unknown
  return { path: '/' };
}
