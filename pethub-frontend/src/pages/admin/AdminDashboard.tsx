import React from 'react';
import { Users, Store, DollarSign, Calendar, ClipboardList, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui';

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Painel Administrativo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total de Usuários" value="0" icon={<Users size={20} />} />
        <StatCard title="Estabelecimentos Ativos" value="0" icon={<Store size={20} />} />
        <StatCard title="Estabelecimentos Pendentes" value="0" icon={<Clock size={20} />} />
        <StatCard title="Profissionais" value="0" icon={<ClipboardList size={20} />} />
        <StatCard title="Agendamentos" value="0" icon={<Calendar size={20} />} />
        <StatCard title="Faturamento Total" value="R$ 0,00" icon={<DollarSign size={20} />} />
      </div>
      <div className="bg-white rounded-2xl border border-neutral-100 p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <Store size={48} className="text-neutral-200 mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 mb-1">Nenhuma solicitação</h3>
        <p className="text-neutral-500">Não há estabelecimentos aguardando aprovação no momento.</p>
      </div>
    </div>
  );
}
