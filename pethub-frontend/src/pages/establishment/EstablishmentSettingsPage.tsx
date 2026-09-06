import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Settings, Bell, Lock, Building2, Clock, ShieldCheck, Check } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { Link } from 'react-router-dom';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';

export default function EstablishmentSettingsPage() {
  const { currentUser } = useAuthStore();
  const toast = useToast();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification toggles
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyAppointments, setNotifyAppointments] = useState(true);
  const [notifyCancellations, setNotifyCancellations] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Preencha as senhas.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/users/me/password', { currentPassword, newPassword });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Senha atual incorreta.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await api.put('/users/me/preferences', {
        notifyOrders,
        notifyAppointments,
        notifyCancellations,
      });
      toast.success('Preferências de notificação salvas!');
    } catch (err) {
      toast.error('Erro ao salvar preferências.');
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Configurações da Conta</h1>
        <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
          Gerencie a segurança da sua conta, notificações e atalhos operacionais
        </p>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/estabelecimento/perfil"
          className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs flex items-center gap-3 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm">Dados e Horários</h3>
            <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Alterar nome, endereço, fotos e horários</p>
          </div>
        </Link>

        <Link
          to="/estabelecimento/funcionarios"
          className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs flex items-center gap-3 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm">Equipe de Atendimento</h3>
            <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Gerenciar funcionários e serviços atribuídos</p>
          </div>
        </Link>
      </div>

      {/* Google Calendar Integration */}
      <GoogleCalendarCard
        returnTo="/estabelecimento/configuracoes"
        roleTitle="os atendimentos do seu estabelecimento"
      />

      {/* Notifications */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#313335] font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
          <Bell size={18} className="text-orange-500" />
          <span>Notificações e Avisos</span>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100/80 dark:hover:bg-[#313335] cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-xs">Novos Agendamentos</p>
              <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">Avisar sempre que um tutor agendar um novo serviço</p>
            </div>
            <input
              type="checkbox"
              checked={notifyAppointments}
              onChange={(e) => setNotifyAppointments(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100/80 dark:hover:bg-[#313335] cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-xs">Novos Pedidos de Produtos</p>
              <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">Avisar quando houver compra confirmada na loja</p>
            </div>
            <input
              type="checkbox"
              checked={notifyOrders}
              onChange={(e) => setNotifyOrders(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100/80 dark:hover:bg-[#313335] cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-xs">Cancelamentos</p>
              <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">Avisar imediatamente caso um agendamento seja cancelado</p>
            </div>
            <input
              type="checkbox"
              checked={notifyCancellations}
              onChange={(e) => setNotifyCancellations(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <Button onClick={handleSaveNotifications} isLoading={savingNotifications} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            Salvar Notificações
          </Button>
        </div>
      </div>

      {/* Security - Password Change */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#313335] font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
          <Lock size={18} className="text-orange-500" />
          <span>Segurança & Alteração de Senha</span>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="Senha Atual *"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="Nova Senha (mínimo 6 caracteres) *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirmar Nova Senha *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" isLoading={passwordLoading} className="bg-neutral-900 dark:bg-orange-500 hover:bg-black dark:hover:bg-orange-600 text-white">
            Atualizar Senha
          </Button>
        </form>
      </div>
    </div>
  );
}
