import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Calendar,
  ShoppingBag,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api } from '@/services/api';
import { formatMessageTimestamp } from '@/utils/date';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'APPOINTMENT' | 'ORDER' | 'MESSAGE' | 'SYSTEM' | string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPopoverProps {
  isEstablishment?: boolean;
  isMobile?: boolean;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isEstablishment = false,
  isMobile = false,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      // Silently fail if unauthorized or backend is temporarily unreachable
    }
  };

  useEffect(() => {
    fetchNotifications();

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

    const handleUpdated = () => {
      fetchNotifications();
    };

    window.addEventListener('pethub:new_notification', handleNewNotification);
    window.addEventListener('pethub:notifications_updated', handleUpdated);

    // Occasional fallback sync every 60s
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      window.removeEventListener('pethub:new_notification', handleNewNotification);
      window.removeEventListener('pethub:notifications_updated', handleUpdated);
      clearInterval(interval);
    };
  }, []);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }

    setIsOpen(false);

    if (isEstablishment) {
      if (notif.type === 'APPOINTMENT') {
        navigate('/estabelecimento/agendamentos');
      } else if (notif.type === 'ORDER') {
        navigate('/estabelecimento/pedidos');
      } else if (notif.type === 'MESSAGE') {
        navigate('/estabelecimento/mensagens');
      } else {
        navigate('/estabelecimento');
      }
    } else {
      // Professional role
      if (notif.type === 'APPOINTMENT') {
        navigate('/profissional/agenda');
      } else if (notif.type === 'MESSAGE') {
        navigate('/profissional/agenda');
      } else {
        navigate('/profissional');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar size={15} className="text-orange-600 dark:text-orange-400" />;
      case 'ORDER':
        return <ShoppingBag size={15} className="text-emerald-600 dark:text-emerald-400" />;
      case 'MESSAGE':
        return <MessageSquare size={15} className="text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell size={15} className="text-orange-600 dark:text-orange-400" />;
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/30';
      case 'ORDER':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30';
      case 'MESSAGE':
        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30';
      default:
        return 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/30';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botão de Sino com Contagem e Indicador de Não Lidas */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative cursor-pointer ${
          isMobile
            ? 'text-neutral-300 dark:text-[#C4C7C5] hover:text-white hover:bg-neutral-800/60'
            : 'text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-[#E3E3E3] hover:bg-neutral-100 dark:hover:bg-[#282A2C]'
        }`}
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 ring-2 ring-white dark:ring-[#1E1F20]" />
          </span>
        )}
      </button>

      {/* Dropdown / Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`${
              isMobile
                ? 'fixed sm:absolute top-16 right-2 left-2 sm:left-auto sm:w-88'
                : 'absolute right-0 mt-2 w-84 sm:w-96'
            } bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/90 dark:border-[#313335] shadow-2xl overflow-hidden z-50 text-left`}
          >
            {/* Header do Popover */}
            <div className="p-3.5 sm:p-4 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between bg-neutral-50/70 dark:bg-[#282A2C]/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Bell size={15} />
                </div>
                <span className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Notificações</span>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-900/40">
                    {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-neutral-400 dark:text-[#8E918F]">
                    Tudo lido
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold transition-colors cursor-pointer"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista de Notificações */}
            <div className="max-h-84 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335] scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-[#313335]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 dark:text-[#8E918F] text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-[#282A2C] flex items-center justify-center mx-auto mb-2 text-neutral-400 dark:text-[#8E918F]">
                    <Bell size={22} />
                  </div>
                  <p className="font-bold text-neutral-700 dark:text-[#C4C7C5] text-sm">Nenhuma notificação</p>
                  <p className="text-[11px] mt-0.5 text-neutral-400 dark:text-[#8E918F]">
                    Você será avisado sobre novos agendamentos, mensagens e pedidos.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const timestampStr = formatMessageTimestamp(notif.createdAt);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-neutral-50/80 dark:hover:bg-[#282A2C] cursor-pointer transition-colors flex items-start gap-3 relative group ${
                        !notif.read ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''
                      }`}
                    >
                      {/* Ícone contextual */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getIconBackground(notif.type)}`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Conteúdo da Notificação */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!notif.read ? 'font-bold text-neutral-900 dark:text-[#E3E3E3]' : 'font-medium text-neutral-700 dark:text-[#C4C7C5]'}`}>
                            {notif.title}
                          </p>
                          {timestampStr && (
                            <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] shrink-0">
                              {timestampStr}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-[#8E918F] line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>

                      {/* Bolinha indicadora de não lida */}
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2 self-start" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
