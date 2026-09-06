import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, DollarSign, Calendar, ClipboardList, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { api } from '@/services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeEstablishments: 0,
    pendingEstablishments: 0,
    professionals: 0,
    appointments: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load admin stats', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-6">Painel Administrativo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <Link to="/admin/usuarios" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Total de Usuários" value={isLoading ? '...' : stats.users} icon={<Users size={20} />} />
        </Link>
        <Link to="/admin/estabelecimentos" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Estabelecimentos Ativos" value={isLoading ? '...' : stats.activeEstablishments} icon={<Store size={20} />} />
        </Link>
        <Link to="/admin/estabelecimentos" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Estabelecimentos Pendentes" value={isLoading ? '...' : stats.pendingEstablishments} icon={<Clock size={20} />} />
        </Link>
        <Link to="/admin/profissionais" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Profissionais Cadastrados" value={isLoading ? '...' : stats.professionals} icon={<ClipboardList size={20} />} />
        </Link>
        <StatCard title="Agendamentos" value={isLoading ? '...' : stats.appointments} icon={<Calendar size={20} />} />
        <StatCard
          title="Faturamento Total"
          value={isLoading ? '...' : (stats.revenue > 0 ? `R$ ${stats.revenue.toFixed(2).replace('.', ',')}` : 'R$ 0,00')}
          icon={<DollarSign size={20} />}
        />
      </div>
      
      {stats.pendingEstablishments === 0 ? (
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <Store size={48} className="text-neutral-200 dark:text-neutral-700 mb-4" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Nenhuma solicitação pendente</h3>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm">Todos os cadastros de estabelecimentos estão em dia.</p>
        </div>
      ) : (
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/40 p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Solicitações Pendentes de Análise</h3>
              <p className="text-neutral-600 dark:text-[#C4C7C5] text-sm mt-0.5">Existem {stats.pendingEstablishments} estabelecimento(s) aguardando aprovação administrativa.</p>
            </div>
          </div>
          <Link
            to="/admin/estabelecimentos"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0 shadow-sm"
          >
            Avaliar Solicitações →
          </Link>
        </div>
      )}
    </div>
  );
}
