import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Calendar, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const SEEN_IDS_KEY = 'pethub_seen_notification_ids';
const MAX_SEEN_HISTORY = 100;
const RECENT_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutos

function getSeenNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markNotificationIdsAsSeen(ids: string[]) {
  try {
    const existing = getSeenNotificationIds();
    const combined = Array.from(new Set([...existing, ...ids])).slice(-MAX_SEEN_HISTORY);
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(combined));
  } catch (err) {
    console.error('Failed to save seen notification IDs', err);
  }
}

export const LoginNotificationModal: React.FC = () => {
  const { isAuthenticated, currentUser, token } = useAuthStore();
  const [newNotifications, setNewNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const resetDismissTimer = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      handleClose();
    }, 8000);
  };

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
            window.dispatchEvent(new CustomEvent('pethub:new_notification', { detail: payload }));

            const seenIds = getSeenNotificationIds();
            if (!seenIds.includes(payload.id)) {
              setNewNotifications((prev) => {
                const exists = prev.some((n) => n.id === payload.id);
                if (exists) return prev;
                return [payload, ...prev];
              });
              setIsOpen(true);
              resetDismissTimer();
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse realtime notification payload', parseErr);
        }
      });

      eventSource.onerror = () => {};
    } catch (err) {
      console.error('Error establishing notification SSE stream', err);
    }

    return () => {
      isSubscribed = false;
      if (eventSource) eventSource.close();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isAuthenticated, token]);

  // 2. Initial login/mount unread check (ONLY genuinely recent notifications <= 60 min)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    let isMounted = true;

    async function checkRecentUnread() {
      try {
        const res = await api.get('/notifications');
        if (Array.isArray(res.data) && isMounted) {
          const seenIds = getSeenNotificationIds();
          const now = Date.now();

          // Strict separation: historical notifications stay in the center,
          // only recent unread notifications (< 60 minutes) trigger automatic toast
          const recentUnseen = res.data.filter((n: any) => {
            if (n.read) return false;
            if (seenIds.includes(n.id)) return false;
            const createdTime = new Date(n.createdAt).getTime();
            return !isNaN(createdTime) && now - createdTime <= RECENT_THRESHOLD_MS;
          });

          if (recentUnseen.length > 0) {
            setNewNotifications(recentUnseen);
            setIsOpen(true);
            resetDismissTimer();
          }
        }
      } catch {}
    }

    const timer = setTimeout(checkRecentUnread, 1000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isAuthenticated, currentUser?.id]);

  const handleClose = () => {
    markNotificationIdsAsSeen(newNotifications.map((n) => n.id));
    setIsOpen(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  const handleViewAll = () => {
    handleClose();
    if (currentUser?.role === 'tutor') {
      navigate('/tutor/notifications');
    } else if (currentUser?.role === 'estabelecimento') {
      navigate('/estabelecimento/agendamentos');
    } else if (currentUser?.role === 'profissional') {
      navigate('/profissional/agenda');
    }
  };

  if (!isAuthenticated || newNotifications.length === 0) return null;

  const currentNotif = newNotifications[0];
  const isAppointment = currentNotif.type === 'APPOINTMENT';
  const isOrder = currentNotif.type === 'ORDER';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="discrete-notification-toast"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onMouseEnter={() => {
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          }}
          onMouseLeave={resetDismissTimer}
          className="fixed bottom-6 right-6 z-50 w-full max-w-sm pointer-events-auto"
        >
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/90 dark:border-[#313335] shadow-xl p-3.5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isAppointment 
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40' 
                  : isOrder 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40'
              }`}>
                {isAppointment ? <Calendar size={16} /> : isOrder ? <ShoppingBag size={16} /> : <Bell size={16} />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">
                    {currentNotif.title}
                  </p>
                  <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] shrink-0 font-medium">
                    agora
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-[#8E918F] leading-relaxed line-clamp-2">
                  {currentNotif.message}
                </p>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                  {newNotifications.length > 1 ? (
                    <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                      +{newNotifications.length - 1} nova{newNotifications.length - 1 !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 dark:text-[#8E918F]">
                      PetHub Notificações
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleViewAll}
                      className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Ver</span>
                      <ArrowRight size={11} />
                    </button>
                    <span className="text-neutral-300 dark:text-[#313335]">•</span>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
