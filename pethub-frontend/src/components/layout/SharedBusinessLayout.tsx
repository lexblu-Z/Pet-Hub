import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '@/services/api';
import {
  PawPrint,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import { Avatar, Button } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/store/themeStore';

export interface NavItemConfig {
  path: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

export interface SharedBusinessLayoutProps {
  businessBadge: string;
  navItems: NavItemConfig[];
  userPhoto?: string | null;
  userName: string;
  userSubtitle?: string;
  isEstablishment?: boolean;
  isPendingApproval?: boolean;
  isSuspended?: boolean;
  pendingApprovalMessage?: string;
  suspensionMessage?: string;
  suspensionReason?: string;
  suspendedUntil?: string | null;
  onLogout: () => void;
  homeLink: string;
}

export const SharedBusinessLayout: React.FC<SharedBusinessLayoutProps> = ({
  businessBadge,
  navItems,
  userPhoto,
  userName,
  userSubtitle,
  isEstablishment = false,
  isPendingApproval = false,
  isSuspended = false,
  pendingApprovalMessage = 'Seu cadastro está em análise pela equipe administrativa.',
  suspensionMessage = 'Sua conta está temporariamente suspensa.',
  suspensionReason,
  suspendedUntil,
  onLogout,
  homeLink,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // In-System Notifications State & Refs
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  // Close notifications on route change
  useEffect(() => {
    setIsNotifOpen(false);
  }, [location.pathname]);

  // Click outside and ESC listener
  useEffect(() => {
    if (!isNotifOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = notifRef.current?.contains(target);
      const insideMobile = mobileNotifRef.current?.contains(target);

      if (!insideDesktop && !insideMobile) {
        setIsNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotifOpen(false);
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
  }, [isNotifOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.read) {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }

    setIsNotifOpen(false);
    if (isEstablishment) {
      if (notif.type === 'APPOINTMENT') navigate('/estabelecimento/agendamentos');
      else if (notif.type === 'ORDER') navigate('/estabelecimento/pedidos');
    } else {
      navigate('/profissional/agenda');
    }
  };

  return (
    <div className="flex h-screen w-full bg-neutral-100 dark:bg-[#131314] overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-neutral-900 dark:bg-[#1E1F20] text-white transition-all duration-300 border-r border-neutral-800 dark:border-[#313335] ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center h-16 px-4 border-b border-neutral-800 dark:border-[#313335] shrink-0 justify-between">
          {!isSidebarCollapsed && (
            <Link to={homeLink} className="flex items-center gap-2 font-bold text-xl text-orange-500">
              <PawPrint size={24} />
              <span>PetHub</span>
            </Link>
          )}
          {isSidebarCollapsed && (
            <Link to={homeLink} className="mx-auto text-orange-500">
              <PawPrint size={24} />
            </Link>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md hover:bg-neutral-800 dark:hover:bg-[#282A2C] text-neutral-400 dark:text-[#8E918F] hover:text-white dark:hover:text-[#E3E3E3] transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-neutral-700 dark:scrollbar-thumb-[#313335]">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-400 dark:text-[#C4C7C5] hover:bg-neutral-800 dark:hover:bg-[#282A2C] hover:text-white dark:hover:text-[#E3E3E3]'
                    }`
                  }
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info / Theme / Logout Footer */}
        <div className="p-4 border-t border-neutral-800 dark:border-[#313335] shrink-0">
          <div className="flex items-center gap-3">
            <Avatar
              src={userPhoto}
              name={userName}
              size="sm"
              isEstablishment={isEstablishment}
              fallbackSrc={isEstablishment ? undefined : '/user.jpg'}
            />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white dark:text-[#E3E3E3] truncate">{userName}</p>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F] truncate">{userSubtitle}</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl text-neutral-400 dark:text-[#C4C7C5] hover:bg-neutral-800 dark:hover:bg-[#282A2C] hover:text-white dark:hover:text-[#E3E3E3] transition-colors ${
                isSidebarCollapsed ? 'mx-auto' : 'flex-1 flex items-center justify-center gap-2 text-xs font-medium border border-neutral-700/60 dark:border-[#313335]'
              }`}
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-neutral-300" />}
              {!isSidebarCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
            </button>
            {!isSidebarCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 flex items-center justify-center gap-2 text-neutral-400 dark:text-[#C4C7C5] hover:text-white dark:hover:text-[#E3E3E3] hover:bg-neutral-800 dark:hover:bg-[#282A2C] border border-neutral-700/60 dark:border-[#313335]"
                onClick={onLogout}
              >
                <LogOut size={16} />
                <span>Sair</span>
              </Button>
            ) : (
              <button
                onClick={onLogout}
                className="mx-auto block p-2 text-neutral-400 dark:text-[#C4C7C5] hover:text-white dark:hover:text-[#E3E3E3] hover:bg-neutral-800 dark:hover:bg-[#282A2C] rounded-md"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between h-16 bg-neutral-900 dark:bg-[#1E1F20] text-white px-4 shrink-0 fixed top-0 w-full z-20 border-b border-neutral-800 dark:border-[#313335]">
        <Link to={homeLink} className="flex items-center gap-2 font-bold text-xl text-orange-500">
          <PawPrint size={24} />
          <span>PetHub</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-neutral-400 dark:text-[#C4C7C5] hover:text-white dark:hover:text-[#E3E3E3]"
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>
          <div className="relative" ref={mobileNotifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-neutral-300 dark:text-[#C4C7C5] hover:text-white relative"
              title="Notificações"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-neutral-900 animate-pulse" />
              )}
            </button>
            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="fixed sm:absolute top-16 right-2 left-2 sm:left-auto sm:w-80 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xl overflow-hidden z-50 text-left"
                >
                  <div className="p-3.5 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between bg-neutral-50/50 dark:bg-[#282A2C]/50">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-orange-500" />
                      <span className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Notificações</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
                          {unreadCount} nova(s)
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-neutral-400 dark:text-[#8E918F] text-xs">
                        <p className="font-semibold text-neutral-600 dark:text-[#C4C7C5]">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 hover:bg-neutral-50 dark:hover:bg-[#282A2C] cursor-pointer transition-colors flex items-start gap-3 ${!notif.read ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{notif.title}</p>
                            <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] line-clamp-2 mt-0.5">{notif.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-neutral-400 dark:text-[#C4C7C5] hover:text-white"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Menu (Overlay Drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-64 bg-neutral-900 dark:bg-[#1E1F20] text-white z-40 flex flex-col md:hidden border-l border-neutral-800 dark:border-[#313335]"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800 dark:border-[#313335]">
                <span className="font-bold text-lg text-white dark:text-[#E3E3E3]">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-neutral-400 dark:text-[#8E918F] hover:text-white dark:hover:text-[#E3E3E3]"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 border-b border-neutral-800 dark:border-[#313335]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={userPhoto}
                    name={userName}
                    size="sm"
                    isEstablishment={isEstablishment}
                    fallbackSrc={isEstablishment ? undefined : '/user.jpg'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white dark:text-[#E3E3E3] truncate">{userName}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] truncate">{userSubtitle}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.end}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-orange-500 text-white'
                              : 'text-neutral-400 dark:text-[#C4C7C5] hover:bg-neutral-800 dark:hover:bg-[#282A2C] hover:text-white dark:hover:text-[#E3E3E3]'
                          }`
                        }
                      >
                        <item.icon size={20} className="shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="p-4 border-t border-neutral-800 dark:border-[#313335] space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm text-neutral-400 dark:text-[#C4C7C5] hover:text-white dark:hover:text-[#E3E3E3] hover:bg-neutral-800 dark:hover:bg-[#282A2C] rounded-xl transition-colors"
                >
                  {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                  <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-start gap-2 text-neutral-400 dark:text-[#C4C7C5] hover:text-white dark:hover:text-[#E3E3E3] hover:bg-neutral-800 dark:hover:bg-[#282A2C]"
                  onClick={onLogout}
                >
                  <LogOut size={18} />
                  Sair
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 pb-16 md:pb-0 relative">
        {/* Desktop Top Header with Notifications */}
        <header className="hidden md:flex h-16 bg-white dark:bg-[#1E1F20] border-b border-neutral-200/80 dark:border-[#313335] px-8 items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base">{userName}</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] rounded-full">
              {businessBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-[#E3E3E3] flex items-center justify-center transition-colors"
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-10 h-10 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-[#E3E3E3] flex items-center justify-center transition-colors relative"
                title="Notificações"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-white dark:ring-[#1E1F20] animate-pulse" />
                )}
              </button>

              {/* Notification Popover */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xl overflow-hidden z-50 text-left"
                  >
                    <div className="p-3.5 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between bg-neutral-50/50 dark:bg-[#282A2C]/50">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-orange-500" />
                        <span className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Notificações</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
                            {unreadCount} nova(s)
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold"
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-neutral-400 dark:text-[#8E918F] text-xs">
                          <Bell size={28} className="mx-auto text-neutral-300 dark:text-[#313335] mb-2" />
                          <p className="font-semibold text-neutral-600 dark:text-[#C4C7C5]">Nenhuma notificação</p>
                          <p className="text-[11px] mt-0.5">Você será avisado sobre novidades e agendamentos.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 hover:bg-neutral-50 dark:hover:bg-[#282A2C] cursor-pointer transition-colors flex items-start gap-3 ${!notif.read ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''}`}
                          >
                            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Bell size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{notif.title}</p>
                              <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] line-clamp-2 mt-0.5">{notif.message}</p>
                              <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] mt-1 block">
                                {new Date(notif.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {isPendingApproval && (
          <div className="bg-amber-100 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-3 shrink-0 flex items-start sm:items-center gap-3 text-amber-900 dark:text-amber-200 z-10 shadow-sm">
            <AlertTriangle className="shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400" size={20} />
            <p className="text-sm font-medium">{pendingApprovalMessage}</p>
          </div>
        )}

        {isSuspended && (
          <div className="bg-orange-100 dark:bg-orange-950/40 border-b border-orange-300 dark:border-orange-800/60 px-6 py-3.5 shrink-0 flex items-start sm:items-center gap-3 text-orange-950 dark:text-orange-200 z-10 shadow-sm">
            <AlertTriangle className="shrink-0 mt-0.5 sm:mt-0 text-orange-600 dark:text-orange-400" size={22} />
            <div>
              <p className="text-sm font-bold">
                {suspensionMessage} {suspendedUntil ? `até ${new Date(suspendedUntil).toLocaleString('pt-BR')}` : ''}.
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
                Motivo: {suspensionReason || 'Violação das regras da plataforma.'}
              </p>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-neutral-50 dark:bg-[#131314] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-[#313335]">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-[#1E1F20] border-t border-neutral-200 dark:border-[#313335] h-16 flex items-center justify-around px-2 z-20 pb-safe">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-orange-500' : 'text-neutral-500 dark:text-[#8E918F]'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
