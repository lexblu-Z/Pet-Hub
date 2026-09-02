import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, User, Star, LogOut, PawPrint } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui';

export const ProfessionalLayout: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col hidden lg:flex shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-neutral-100">
          <Link to="/profissional" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold">Pet<span className="text-orange-500">Hub</span></span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {[
            { to: '/profissional', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
            { to: '/profissional/agenda', icon: <Calendar size={18} />, label: 'Minha Agenda' },
            { to: '/profissional/ordens', icon: <ClipboardList size={18} />, label: 'Ordens de Serviço' },
            { to: '/profissional/avaliacoes', icon: <Star size={18} />, label: 'Avaliações' },
            { to: '/profissional/perfil', icon: <User size={18} />, label: 'Meu Perfil' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-neutral-600 hover:bg-neutral-50'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-100">
          <div className="flex items-center gap-3 p-2 mb-2">
            <Avatar src={currentUser?.avatar} name={currentUser?.name || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
              <p className="text-xs text-neutral-400">Profissional</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/auth/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside className="w-64 bg-neutral-900 flex flex-col hidden lg:flex shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Pet<span className="text-orange-400">Hub</span></span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {[
            { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
            { to: '/admin/estabelecimentos', icon: <Star size={18} />, label: 'Estabelecimentos' },
            { to: '/admin/usuarios', icon: <User size={18} />, label: 'Usuários' },
          ].map((item) => (
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
