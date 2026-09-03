import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, User, Star, LogOut, PawPrint, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui';

export { ProfessionalLayout } from './ProfessionalLayout';

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
