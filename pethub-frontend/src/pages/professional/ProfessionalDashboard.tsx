import React from 'react';
import { Calendar, Star, Search, Stethoscope, Clock, CheckCircle2, UserCheck, Shield, FileText } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

export default function ProfessionalDashboard() {
  const { currentUser } = useAuthStore();
  const profProfile = (currentUser as any)?.professionalProfile;
  const isPending = profProfile?.status === 'PENDING_APPROVAL' || !profProfile?.status;
  const isSuspended = profProfile?.status === 'SUSPENDED';
  const specialty = profProfile?.specialty || 'Veterinário / Especialista';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Professional Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Stethoscope size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Olá, {currentUser?.name || 'Profissional'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
                Profissional
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
              <span>{specialty}</span>
              {profProfile?.document && (
                <span className="text-slate-400 font-mono">({profProfile.document})</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuspended ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              Conta Suspensa
            </div>
          ) : isPending ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Cadastro em Análise
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={14} />
              Perfil Verificado & Ativo
            </div>
          )}
        </div>
      </div>

      {/* Suspended Alert Banner */}
      {isSuspended && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-6 shadow-xs text-orange-950">
          <h2 className="text-base font-bold text-orange-950">Conta Temporariamente Suspensa</h2>
          <p className="text-xs sm:text-sm text-orange-900 mt-1">
            Seu perfil profissional está temporariamente suspenso{profProfile?.suspendedUntil ? ` até ${new Date(profProfile.suspendedUntil).toLocaleString('pt-BR')}` : ''}.
          </p>
          <p className="text-xs text-orange-800 bg-white/70 p-3 rounded-xl border border-orange-200 mt-2">
            <span className="font-bold">Motivo da suspensão:</span> {profProfile?.suspensionReason || 'Violação das regras da plataforma.'}
          </p>
          <p className="text-[11px] text-orange-700 mt-1">
            A reativação ocorrerá de forma automática no término do período.
          </p>
        </div>
      )}

      {/* Pending Approval Checklist Card */}
      {isPending && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 text-amber-950">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Aprovação Cadastral Pendente</h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                Seu perfil profissional está em processo de verificação pela equipe administrativa do PetHub.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-100 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">✓</div>
              <span className="text-xs font-bold text-neutral-800">Conta registrada</span>
            </div>
            <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-100 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">⏳</div>
              <span className="text-xs font-bold text-neutral-800">Validação de registro</span>
            </div>
            <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-100 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center text-xs font-bold">3</div>
              <span className="text-xs font-medium text-neutral-500">Liberação de agenda</span>
            </div>
          </div>
        </div>
      )}

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Atendimentos Hoje" value="0" icon={<Calendar size={20} className="text-teal-600" />} />
        <StatCard title="Próximos Atendimentos" value="0" icon={<Clock size={20} className="text-teal-600" />} />
        <StatCard title="Pacientes Atendidos" value="0" icon={<UserCheck size={20} className="text-teal-600" />} />
        <StatCard title="Avaliação Média" value="5.0" icon={<Star size={20} className="text-teal-600" />} />
      </div>

      {/* Daily Agenda Section */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
          <div className="flex items-center gap-2.5">
            <Calendar size={20} className="text-teal-600" />
            <h3 className="font-bold text-neutral-900 text-base">Agenda de Consultas e Atendimentos</h3>
          </div>
          <span className="text-xs text-neutral-400 font-medium">Hoje</span>
        </div>

        <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Stethoscope size={40} className="mx-auto text-slate-300 mb-3" />
          <h4 className="font-bold text-neutral-800 text-sm mb-1">Nenhum atendimento agendado para hoje</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Assim que tutores ou estabelecimentos realizarem agendamentos para seus serviços, eles aparecerão detalhados aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
