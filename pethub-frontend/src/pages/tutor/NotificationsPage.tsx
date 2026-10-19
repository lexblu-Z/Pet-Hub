import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { resolveNotificationRoute } from '@/utils/notificationNavigation';
import { EmptyState } from '@/components/ui';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentUser, currentRole } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadNotifications();

    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newNotif = customEvent.detail;
      if (newNotif && newNotif.id) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
    };

    window.addEventListener('pethub:new_notification', handleNewNotification);
    return () => {
      window.removeEventListener('pethub:new_notification', handleNewNotification);
    };
  }, []);

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.read) {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
        window.dispatchEvent(new CustomEvent('pethub:notifications_updated'));
      }
    } catch (err) {
      console.error(err);
    }
    const target = resolveNotificationRoute(notif, currentRole, currentUser);
    navigate(target.path, { state: target.state });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Notificações</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Atualizações sobre seus agendamentos, compras e conta
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors cursor-pointer px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 dark:bg-[#1E1F20] border border-transparent dark:border-[#313335] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-8 border border-neutral-100 dark:border-[#313335] text-center shadow-xs">
          <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-orange-500">
            <Bell size={24} />
          </div>
          <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-base mb-1">Nenhuma notificação por aqui</h3>
          <p className="text-neutral-400 dark:text-neutral-500 text-xs max-w-sm mx-auto">
            Quando você realizar agendamentos, compras ou receber cashback, as novidades aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                !notif.read 
                  ? 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-500/30 shadow-xs' 
                  : 'bg-white dark:bg-[#1E1F20] border-neutral-100 dark:border-[#313335] shadow-xs hover:border-neutral-200 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-sm font-bold ${!notif.read ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                  {notif.title}
                </h3>
                {!notif.read && <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-2">{notif.message}</p>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <Clock size={12} />
                  <span>
                    {new Date(notif.createdAt || notif.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1">
                  <span>Ver detalhes</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
