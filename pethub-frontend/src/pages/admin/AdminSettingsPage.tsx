import React, { useState } from 'react';
import { Settings, Shield, UserPlus, Sliders, CheckCircle2, Lock } from 'lucide-react';
import AdminAdminsPage from './AdminAdminsPage';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'admins' | 'system'>('admins');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
          <Settings size={24} className="text-orange-500" />
          <span>Configurações do Sistema</span>
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Parâmetros globais, políticas de governança e gestão de credenciais administrativas
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 dark:border-[#313335] pb-2">
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-[#1E1F20] text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <UserPlus size={14} />
          <span>Gestão de Administradores</span>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'system'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-[#1E1F20] text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Sliders size={14} />
          <span>Parâmetros Operacionais</span>
        </button>
      </div>

      {activeTab === 'admins' ? (
        <AdminAdminsPage />
      ) : (
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
              Políticas de Marketplace & Taxas
            </h2>
            <p className="text-neutral-500">Regras contábeis e financeiras aplicadas à plataforma</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-200 dark:border-[#313335] space-y-1">
              <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-xs">
                Taxa de Serviço da Plataforma
              </span>
              <p className="text-2xl font-bold text-orange-600">10,0%</p>
              <p className="text-neutral-400 text-[11px]">
                Retenção padrão sobre serviços e produtos intermediados pelo PetHub.
              </p>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-200 dark:border-[#313335] space-y-1">
              <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-xs">
                Timezone Operacional
              </span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">America/Sao_Paulo (UTC-3)</p>
              <p className="text-neutral-400 text-[11px]">
                Horário oficial brasileiro para agendamentos, relatórios contábeis e logs.
              </p>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-200 dark:border-[#313335] space-y-2">
            <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-xs">
              Mecanismos de Segurança Ativos
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Autenticação JWT com hook Fastify obrigatório</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Auditoria imutável de decisões de moderação</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Validação Zod de payloads no backend</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Proteção contra auto-exclusão do último admin</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
