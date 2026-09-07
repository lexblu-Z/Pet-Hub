import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, X, Clock, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const SEEN_IDS_KEY = 'pethub_seen_notification_ids';

function getSeenNotificationIds(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markNotificationIdsAsSeen(ids: string[]) {
  try {
    const existing = getSeenNotificationIds();
    const set = new Set([...existing, ...ids]);
    sessionStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error('Failed to save seen notification IDs', err);
  }
}

export const LoginNotificationModal: React.FC = () => {
  const { isAuthenticated, currentUser, token } = useAuthStore();
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // 1. Listen to Realtime SSE Stream
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    try {
      const baseUrl = api.defaults.baseURL || 'http://localhost:3000/api';
      const streamUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('notification', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.id) {
            // Dispatch global event for popover and header badges
            window.dispatchEvent(new CustomEvent('pethub:new_notification', { detail: payload }));

            // ID-based tracking: only show popup if this specific ID was NOT seen/dismissed in this session
            const seenIds = getSeenNotificationIds();
            if (!seenIds.includes(payload.id)) {
              setUnreadNotifications((prev) => {
                const exists = prev.some((n) => n.id === payload.id);
                if (exists) return prev;
                return [payload, ...prev];
              });
              setIsOpen(true);
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse realtime notification payload', parseErr);
        }
      });

      eventSource.onerror = () => {
        // EventSource automatically retries
      };
    } catch (err) {
      console.error('Error establishing notification SSE stream', err);
    }

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, token]);

  // 2. Initial login/mount unread check (filtered against seen IDs)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    let isMounted = true;

    async function checkUnread() {
      try {
        const res = await api.get('/notifications');
        if (Array.isArray(res.data) && isMounted) {
          const seenIds = getSeenNotificationIds();
          const unreadUnseen = res.data.filter((n: any) => !n.read && !seenIds.includes(n.id));
          if (unreadUnseen.length > 0) {
            setUnreadNotifications(unreadUnseen);
            setIsOpen(true);
          }
        }
      } catch (err) {
        // Silently fail if endpoint is not reachable or unauthenticated
      }
    }

    const timer = setTimeout(checkUnread, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, currentUser?.id]);

  const handleClose = () => {
    markNotificationIdsAsSeen(unreadNotifications.map((n) => n.id));
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markNotificationIdsAsSeen(unreadNotifications.map((n) => n.id));
      setUnreadNotifications([]);
      window.dispatchEvent(new CustomEvent('pethub:notifications_updated'));
    } catch (err) {
      console.error('Erro ao marcar como lidas', err);
    } finally {
      setIsOpen(false);
    }
  };

  const handleViewAll = () => {
    handleClose();
    if (currentUser?.role === 'tutor') {
      navigate('/tutor/notifications');
    }
  };

  if (!isOpen || unreadNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200 dark:border-[#313335] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-base leading-tight">
                Novas Notificações
              </h3>
              <p className="text-xs text-neutral-400">
                Você tem {unreadNotifications.length} mensagem(ns) não lida(s)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of recent unread */}
        <div className="p-5 max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335] space-y-3">
          {unreadNotifications.slice(0, 3).map((n) => (
            <div key={n.id} className="pt-3 first:pt-0 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  {n.title}
                </h4>
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {n.message}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 pt-0.5">
                <Clock size={11} />
                <span>{new Date(n.createdAt).toLocaleDateString('pt-BR')} às {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}

          {unreadNotifications.length > 3 && (
            <p className="text-center text-xs text-neutral-400 pt-2">
              + {unreadNotifications.length - 3} outra(s) notificação(ões)
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-50 dark:bg-[#131314] border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer px-2 py-1.5"
          >
            Marcar todas como lidas
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Entendido
            </button>
            {currentUser?.role === 'tutor' && (
              <button
                onClick={handleViewAll}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Ver todas</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
