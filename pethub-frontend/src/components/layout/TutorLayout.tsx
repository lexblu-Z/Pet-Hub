import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  PawPrint,
  Search,
  Calendar,
  ShoppingBag,
  Coins,
  MessageCircle,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Heart,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { useThemeStore } from '@/store/themeStore';
import { Avatar, Badge } from '@/components/ui';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: number;
}

const navItems: NavItem[] = [
  { to: '/tutor', icon: <Home size={20} />, label: 'Início', end: true },
  { to: '/tutor/pets', icon: <PawPrint size={20} />, label: 'Meus Pets' },
  { to: '/tutor/explore', icon: <Search size={20} />, label: 'Explorar' },
  { to: '/tutor/appointments', icon: <Calendar size={20} />, label: 'Agendamentos' },
  { to: '/tutor/shop', icon: <ShoppingBag size={20} />, label: 'Loja' },
  { to: '/tutor/cashback', icon: <Coins size={20} />, label: 'Cashback' },
  { to: '/tutor/chat', icon: <MessageCircle size={20} />, label: 'Chat', badge: 1 },
  { to: '/tutor/favorites', icon: <Heart size={20} />, label: 'Favoritos' },
  { to: '/tutor/notifications', icon: <Bell size={20} />, label: 'Notificações', badge: 3 },
  { to: '/tutor/profile', icon: <User size={20} />, label: 'Perfil' },
];

const bottomNavItems: NavItem[] = [
  { to: '/tutor', icon: <Home size={22} />, label: 'Início', end: true },
  { to: '/tutor/explore', icon: <Search size={22} />, label: 'Explorar' },
  { to: '/tutor/booking', icon: <Plus size={22} />, label: 'Agendar' },
  { to: '/tutor/favorites', icon: <Heart size={22} />, label: 'Favoritos' },
  { to: '/tutor/profile', icon: <User size={22} />, label: 'Perfil' },
];

export const TutorLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', title: 'Até logo!', message: 'Você saiu da sua conta.' });
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-[#131314] overflow-hidden">
      {/* ---- Desktop Sidebar ---- */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-white dark:bg-[#1E1F20] border-r border-neutral-100 dark:border-[#313335] shadow-sm overflow-hidden shrink-0 z-10"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-neutral-100 dark:border-[#313335] shrink-0">
          <Link to="/tutor" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <PawPrint size={18} className="text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] whitespace-nowrap overflow-hidden"
                >
                  Pet<span className="text-orange-500">Hub</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="ml-auto p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E3E3E3] transition-colors shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-50 dark:hover:bg-[#282A2C] hover:text-neutral-900 dark:hover:text-[#E3E3E3]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`shrink-0 ${isActive ? 'text-orange-500' : ''}`}>
                    {item.icon}
                  </span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden flex-1"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && !sidebarCollapsed && (
                    <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-5 text-center">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && sidebarCollapsed && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                  {sidebarCollapsed && isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-neutral-100 dark:border-[#313335] shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Avatar
              src={currentUser?.avatar}
              name={currentUser?.name || ''}
              size="sm"
              status="online"
              fallbackSrc={currentUser?.defaultAvatar || undefined}
              entityType="tutor"
            />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-neutral-800 dark:text-[#E3E3E3] truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] truncate">{currentUser?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-1">
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-[#E3E3E3] hover:bg-neutral-50 dark:hover:bg-[#282A2C] rounded-xl transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={15} className="text-orange-500" /> : <Sun size={15} className="text-orange-500" />}
                  <span>{theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}</span>
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider font-mono">
                  {theme}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                className="w-full flex items-center justify-center p-2 text-neutral-500 dark:text-[#C4C7C5] hover:text-neutral-800 dark:hover:text-[#E3E3E3] hover:bg-neutral-50 dark:hover:bg-[#282A2C] rounded-xl transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Moon size={16} className="text-orange-500" /> : <Sun size={16} className="text-orange-500" />}
              </button>
            )}
          </div>

          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-neutral-500 dark:text-[#C4C7C5] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200"
              >
                <LogOut size={16} />
                Sair
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ---- Mobile Menu Overlay ---- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#1E1F20] z-50 lg:hidden flex flex-col shadow-2xl border-r border-neutral-100 dark:border-[#313335]"
            >
              <div className="h-16 flex items-center px-4 border-b border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <PawPrint size={18} className="text-white" />
                  </div>
                  <span className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                    Pet<span className="text-orange-500">Hub</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-auto p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-500 dark:text-[#C4C7C5]"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-50 dark:hover:bg-[#282A2C]',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? 'text-orange-500' : ''}>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    src={currentUser?.avatar}
                    name={currentUser?.name || ''}
                    size="md"
                    fallbackSrc={currentUser?.defaultAvatar || undefined}
                    entityType="tutor"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-[#E3E3E3]">{currentUser?.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{currentUser?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                >
                  <LogOut size={16} />
                  Sair da conta
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---- Main Content ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden h-14 bg-white dark:bg-[#1E1F20] border-b border-neutral-100 dark:border-[#313335] flex items-center px-4 gap-3 shrink-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]"
          >
            <Menu size={20} />
          </button>
          <Link to="/tutor" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <PawPrint size={14} className="text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              title="Alternar tema"
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Moon size={18} className="text-orange-500" /> : <Sun size={18} className="text-orange-500" />}
            </button>
            <NavLink
              to="/tutor/notifications"
              className="relative p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            </NavLink>
            <NavLink to="/tutor/profile">
              <Avatar
                src={currentUser?.avatar}
                name={currentUser?.name || ''}
                size="sm"
                fallbackSrc={currentUser?.defaultAvatar || undefined}
                entityType="tutor"
              />
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* ---- Mobile Bottom Navigation ---- */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E1F20] border-t border-neutral-100 dark:border-[#313335] z-30 safe-bottom">
          <div className="flex items-center justify-around px-2 py-1.5">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0',
                    item.label === 'Agendar'
                      ? 'relative'
                      : '',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label === 'Agendar' ? (
                      <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.4)] -mt-5">
                        <Plus size={22} className="text-white" />
                      </div>
                    ) : (
                      <span className={isActive ? 'text-orange-500' : 'text-neutral-400'}>
                        {item.icon}
                      </span>
                    )}
                    <span
                      className={[
                        'text-xs font-medium truncate',
                        item.label === 'Agendar' ? 'text-orange-500' : isActive ? 'text-orange-500' : 'text-neutral-400',
                      ].join(' ')}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};
