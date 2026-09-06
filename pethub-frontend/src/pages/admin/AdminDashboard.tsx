import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, DollarSign, Calendar, ClipboardList, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { api } from '@/services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeEstablishments: 0,
    pendingEstablishments: 0,
    professionals: 0,
    pendingProfessionals: 0,
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

  const totalPending = (stats.pendingEstablishments || 0) + (stats.pendingProfessionals || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Painel Administrativo</h1>
          <p className="text-sm text-neutral-500 dark:text-[#8E918F] mt-0.5">
            Visão geral da plataforma, controle de cadastros e aprovações
          </p>
        </div>
        {totalPending > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold self-start sm:self-auto">
            <Clock size={14} />
            <span>{totalPending} cadastro(s) aguardando moderação</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Link to="/admin/usuarios" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Total de Usuários" value={isLoading ? '...' : stats.users} icon={<Users size={20} />} />
        </Link>
        <Link to="/admin/estabelecimentos" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Estabelecimentos Ativos" value={isLoading ? '...' : stats.activeEstablishments} icon={<Store size={20} />} />
        </Link>
        <Link to="/admin/estabelecimentos" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Estabelecimentos Pendentes"
            value={isLoading ? '...' : stats.pendingEstablishments}
            icon={<Clock size={20} className={stats.pendingEstablishments > 0 ? 'text-amber-500' : ''} />}
          />
        </Link>
        <Link to="/admin/profissionais" className="block transition-transform hover:-translate-y-0.5">
          <StatCard title="Profissionais Cadastrados" value={isLoading ? '...' : stats.professionals} icon={<ClipboardList size={20} />} />
        </Link>
        <Link to="/admin/profissionais" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Profissionais Pendentes"
            value={isLoading ? '...' : (stats.pendingProfessionals || 0)}
            icon={<UserCheck size={20} className={(stats.pendingProfessionals || 0) > 0 ? 'text-amber-500' : ''} />}
          />
        </Link>
        <StatCard title="Agendamentos" value={isLoading ? '...' : stats.appointments} icon={<Calendar size={20} />} />
        <StatCard
          title="Faturamento Total"
          value={isLoading ? '...' : (stats.revenue > 0 ? `R$ ${stats.revenue.toFixed(2).replace('.', ',')}` : 'R$ 0,00')}
          icon={<DollarSign size={20} />}
        />
      </div>

      {/* Fila de Moderação e Análise Administrativa */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
          <ShieldCheck size={20} className="text-orange-500" />
          <span>Fila de Aprovação Administrativa</span>
        </h2>

        {totalPending === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-10 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Tudo em dia!</h3>
            <p className="text-neutral-500 dark:text-[#8E918F] text-sm max-w-sm">
              Nenhuma solicitação de estabelecimento ou profissional pendente de aprovação no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card de Estabelecimentos Pendentes */}
            {stats.pendingEstablishments > 0 ? (
              <div className="bg-orange-50/70 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/40 p-6 flex flex-col justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                    <Store size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">Estabelecimentos</h3>
                    <p className="text-neutral-600 dark:text-[#C4C7C5] text-xs mt-1">
                      <strong>{stats.pendingEstablishments}</strong> estabelecimento(s) aguardando validação de dados e documentos.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-orange-200/60 dark:border-orange-900/40">
                  <Link
                    to="/admin/estabelecimentos"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    Avaliar Estabelecimentos →
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Card de Profissionais Pendentes */}
            {(stats.pendingProfessionals || 0) > 0 ? (
              <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-6 flex flex-col justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">Profissionais Autônomos</h3>
                    <p className="text-neutral-600 dark:text-[#C4C7C5] text-xs mt-1">
                      <strong>{stats.pendingProfessionals}</strong> profissional(is) aguardando verificação de registro/conselho.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                  <Link
                    to="/admin/profissionais"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    Avaliar Profissionais →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
