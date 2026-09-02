import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

export default function EstablishmentDashboard() {
  const { currentUser } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight drop-shadow-sm flex items-center gap-2">
          {greeting} pessoal, da <span className="bg-gradient-to-br from-neutral-800 to-black bg-clip-text text-transparent">{currentUser?.name || 'Clínica'}</span>
        </h1>
        <p className="text-neutral-500 mt-1">Bem-vindo(a) ao seu painel de controle.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Faturamento Mensal" value="R$ 12.450" icon={<DollarSign size={20} />} trend="up" change={12.5} />
        <StatCard title="Agendamentos" value="142" icon={<Calendar size={20} />} trend="up" change={5.2} />
        <StatCard title="Novos Clientes" value="28" icon={<Users size={20} />} trend="down" change={-2.1} />
        <StatCard title="Taxa de Retenção" value="85%" icon={<TrendingUp size={20} />} trend="up" change={1.5} />
      </div>
      <div className="bg-white rounded-2xl border border-neutral-100 p-6 h-96 flex items-center justify-center shadow-sm">
        <p className="text-neutral-400">Gráfico de desempenho será exibido aqui</p>
      </div>
    </div>
  );
}
