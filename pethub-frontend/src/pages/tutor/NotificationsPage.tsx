import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { EmptyState } from '@/components/ui';

export default function NotificationsPage() {
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
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Notificações</h1>
          <p className="text-sm text-neutral-500">Atualizações sobre seus agendamentos, compras e conta</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-neutral-100 text-center shadow-sm">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-orange-500">
            <Bell size={24} />
          </div>
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhuma notificação por aqui</h3>
          <p className="text-neutral-400 text-xs max-w-sm mx-auto">
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
              onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                !notif.read 
                  ? 'bg-orange-50/70 border-orange-200/80 shadow-xs' 
                  : 'bg-white border-neutral-100 shadow-xs hover:border-neutral-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-sm font-bold ${!notif.read ? 'text-neutral-900' : 'text-neutral-700'}`}>
                  {notif.title}
                </h3>
                {!notif.read && <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />}
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed mb-2">{notif.message}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <Clock size={12} />
                <span>
                  {new Date(notif.createdAt || notif.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
