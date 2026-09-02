import React from 'react';
import { Calendar, Star } from 'lucide-react';
import { StatCard } from '@/components/ui';

export default function ProfessionalDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Meu Painel</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard title="Atendimentos Hoje" value="8" icon={<Calendar size={20} />} />
        <StatCard title="Avaliação Média" value="4.9" icon={<Star size={20} />} />
      </div>
      <div className="bg-white rounded-2xl border border-neutral-100 p-6 flex items-center justify-center">
        <p className="text-neutral-400">Agenda do dia será exibida aqui</p>
      </div>
    </div>
  );
}
