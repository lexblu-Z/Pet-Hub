import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, User, Star, LogOut, PawPrint, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui';

export const ProfessionalLayout: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const profProfile = (currentUser as any)?.professionalProfile;
  const isPendingApproval = profProfile?.status === 'PENDING_APPROVAL' || !profProfile?.status;

  const navItems = [
    { to: '/profissional', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    { to: '/profissional/agenda', icon: <Calendar size={18} />, label: 'Minha Agenda' },
    { to: '/profissional/ordens', icon: <ClipboardList size={18} />, label: 'Ordens de Serviço' },
    { to: '/profissional/avaliacoes', icon: <Star size={18} />, label: 'Avaliações' },
    { to: '/profissional/perfil', icon: <User size={18} />, label: 'Meu Perfil' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950/5 overflow-hidden">
      {/* Mobile Top Header */}
      <div className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30">
        <Link to="/profissional" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-xs">
            <Stethoscope size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">Pet<span className="text-teal-400">Hub</span> <span className="text-xs font-semibold text-teal-300 bg-teal-900/60 border border-teal-700/50 px-1.5 py-0.5 rounded ml-1">Profissional</span></span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1 z-20">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      )}

      {/* Desktop Sidebar - Dark and Elegant */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden lg:flex shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-slate-800 justify-between">
          <Link to="/profissional" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <Stethoscope size={18} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Pet<span className="text-teal-400">Hub</span></span>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-teal-400">Área Profissional</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 font-semibold border-l-4 border-teal-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 mb-2 bg-slate-800/40 rounded-xl border border-slate-800">
            <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
              <p className="text-xs text-teal-400 truncate">{profProfile?.specialty || 'Profissional'}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {isPendingApproval && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 shrink-0 flex items-center gap-3 text-amber-900 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Seu cadastro profissional está em análise pela moderação. Algumas funcionalidades serão liberadas após a aprovação.</span>
          </div>
        )}
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    { to: '/admin/estabelecimentos', icon: <Star size={18} />, label: 'Estabelecimentos' },
    { to: '/admin/profissionais', icon: <Stethoscope size={18} />, label: 'Profissionais' },
    { to: '/admin/usuarios', icon: <User size={18} />, label: 'Usuários' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-50 overflow-hidden">
      {/* Mobile Top Header */}
      <div className="lg:hidden h-16 bg-neutral-900 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-30">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">Pet<span className="text-orange-400">Hub</span> <span className="text-xs font-normal text-white/50 border border-white/20 px-1.5 py-0.5 rounded ml-1">Admin</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="xs" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-neutral-900 border-b border-white/10 px-4 py-3 space-y-1 z-20">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-neutral-900 flex flex-col hidden lg:flex shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Pet<span className="text-orange-400">Hub</span> <span className="text-xs font-normal text-white/50 border border-white/20 px-1.5 py-0.5 rounded ml-1">Admin</span></span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 mb-2">
            <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate">{currentUser?.name}</p>
              <p className="text-xs text-white/40">Administrador</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
