import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  ShoppingCart,
  Users,
  Wrench,
  Package,
  BarChart3,
  DollarSign,
  UserCheck,
  FileText,
  Store,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PawPrint,
  Menu,
  X,
  Bell,
  TrendingUp,
  Receipt,
  Boxes,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { Avatar } from '@/components/ui';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { to: '/estabelecimento', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    ],
  },
  {
    title: 'Atendimento',
    items: [
      { to: '/estabelecimento/agendamentos', icon: <Calendar size={18} />, label: 'Agendamentos' },
      { to: '/estabelecimento/ordens', icon: <ClipboardList size={18} />, label: 'Ordens de Serviço' },
      { to: '/estabelecimento/pdv', icon: <ShoppingCart size={18} />, label: 'PDV / Vendas' },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/estabelecimento/profissionais', icon: <Users size={18} />, label: 'Profissionais' },
      { to: '/estabelecimento/servicos', icon: <Wrench size={18} />, label: 'Serviços' },
      { to: '/estabelecimento/estoque', icon: <Boxes size={18} />, label: 'Estoque' },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { to: '/estabelecimento/relatorios/agendamentos', icon: <BarChart3 size={18} />, label: 'Agendamentos' },
      { to: '/estabelecimento/relatorios/financeiro', icon: <DollarSign size={18} />, label: 'Financeiro' },
      { to: '/estabelecimento/relatorios/clientes', icon: <UserCheck size={18} />, label: 'Clientes' },
      { to: '/estabelecimento/relatorios/estoque', icon: <TrendingUp size={18} />, label: 'Estoque' },
    ],
  },
  {
    title: 'Documentos',
    items: [
      { to: '/estabelecimento/notas-fiscais', icon: <Receipt size={18} />, label: 'Notas Fiscais' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { to: '/estabelecimento/perfil', icon: <Store size={18} />, label: 'Perfil do Negócio' },
      { to: '/estabelecimento/chat', icon: <MessageCircle size={18} />, label: 'Chat' },
    ],
  },
];

export const EstablishmentLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', title: 'Até logo!' });
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* ---- Desktop Sidebar ---- */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-neutral-900 overflow-hidden shrink-0 z-10"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10 shrink-0">
          <Link to="/estabelecimento" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <PawPrint size={18} className="text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xl font-bold text-white whitespace-nowrap"
                >
                  Pet<span className="text-orange-400">Hub</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-4">
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-1"
                  >
                    {section.title}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                        isActive
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`shrink-0 ${isActive ? 'text-orange-400' : ''}`}>
                          {item.icon}
                        </span>
                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {sidebarCollapsed && isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-400 rounded-r-full" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="sm" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-white/90 truncate">{currentUser?.name}</p>
                  <p className="text-xs text-white/40 truncate">Estabelecimento</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <LogOut size={16} />
                Sair
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ---- Mobile Header ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden h-14 bg-neutral-900 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl hover:bg-white/10 text-white"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <PawPrint size={14} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">Pet<span className="text-orange-400">Hub</span></span>
          </div>
          <div className="ml-auto">
            <button className="p-2 rounded-xl hover:bg-white/10 text-white/60">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.3 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-neutral-900 z-50 overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <span className="text-xl font-bold text-white">Pet<span className="text-orange-400">Hub</span></span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white/60 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <nav className="p-2">
                  {navSections.map((section, sIdx) => (
                    <div key={sIdx} className="mb-4">
                      <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-1">{section.title}</p>
                      {section.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                              isActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/60 hover:text-white'
                            }`
                          }
                        >
                          {item.icon}
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  ))}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
