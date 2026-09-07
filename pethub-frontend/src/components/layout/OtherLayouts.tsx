import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Stethoscope,
  PawPrint,
  Calendar,
  ShieldAlert,
  DollarSign,
  Bell,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { Avatar } from '@/components/ui';
import { NotificationPopover } from '@/components/shared/NotificationPopover';

export { ProfessionalLayout } from './ProfessionalLayout';

interface NavGroup {
  title?: string;
  items: {
    to: string;
    icon: React.ReactNode;
    label: string;
    end?: boolean;
  }[];
}

export const AdminLayout: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navGroups: NavGroup[] = [
    {
      items: [
        { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
      ],
    },
    {
      title: 'GESTÃO',
      items: [
        { to: '/admin/usuarios', icon: <Users size={18} />, label: 'Usuários' },
        { to: '/admin/estabelecimentos', icon: <Building2 size={18} />, label: 'Estabelecimentos' },
        { to: '/admin/profissionais', icon: <Stethoscope size={18} />, label: 'Profissionais' },
        { to: '/admin/pets', icon: <PawPrint size={18} />, label: 'Pets' },
      ],
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { to: '/admin/agendamentos', icon: <Calendar size={18} />, label: 'Agendamentos' },
        { to: '/admin/moderacao', icon: <ShieldAlert size={18} />, label: 'Moderação' },
      ],
    },
    {
      title: 'FINANCEIRO',
      items: [
        { to: '/admin/financeiro', icon: <DollarSign size={18} />, label: 'Financeiro' },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { to: '/admin/notificacoes', icon: <Bell size={18} />, label: 'Notificações' },
        { to: '/admin/auditoria', icon: <FileText size={18} />, label: 'Auditoria' },
        { to: '/admin/configuracoes', icon: <Settings size={18} />, label: 'Configurações' },
      ],
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-50 dark:bg-[#131314] overflow-hidden">
      {/* Mobile Top Header */}
      <div className="lg:hidden h-16 bg-neutral-900 dark:bg-[#1E1F20] border-b border-white/10 dark:border-[#313335] px-4 flex items-center justify-between shrink-0 z-30">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">
            Pet<span className="text-orange-400">Hub</span>{' '}
            <span className="text-xs font-normal text-white/50 border border-white/20 px-1.5 py-0.5 rounded ml-1">
              Admin
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationPopover isMobile />
          <button
            onClick={toggleTheme}
            className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 dark:hover:bg-[#282A2C]"
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>
          <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="xs" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 dark:hover:bg-[#282A2C]"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-neutral-900 dark:bg-[#1E1F20] border-b border-white/10 dark:border-[#313335] px-4 py-3 space-y-3 z-20 max-h-[80vh] overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/70 hover:text-white hover:bg-white/5 dark:hover:bg-[#282A2C]'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
              navigate('/auth/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-neutral-900 dark:bg-[#1E1F20] border-r border-white/10 dark:border-[#313335] flex flex-col hidden lg:flex shrink-0">
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 dark:border-[#313335]">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Pet<span className="text-orange-400">Hub</span>{' '}
              <span className="text-xs font-normal text-white/50 border border-white/20 px-1.5 py-0.5 rounded ml-1">
                Admin
              </span>
            </span>
          </Link>
          <NotificationPopover />
        </div>

        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-white/60 hover:text-white/90 hover:bg-white/5 dark:hover:bg-[#282A2C]'
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

        <div className="p-3 border-t border-white/10 dark:border-[#313335]">
          <div className="flex items-center gap-3 p-2 mb-2">
            <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate">{currentUser?.name}</p>
              <p className="text-xs text-white/40">Administrador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 dark:hover:bg-[#282A2C] rounded-xl transition-all border border-white/10 dark:border-[#313335]"
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/auth/login');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-white/10 dark:border-[#313335]"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-[#131314]">
        <Outlet />
      </main>
    </div>
  );
};
