import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  CheckCircle2,
  Clock,
  History,
  Shield,
  Filter,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToastStore } from '@/store/toastStore';

export default function AdminNotificationsPage() {
  const { addToast } = useToastStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'TUTORS' | 'PROFESSIONALS' | 'ESTABLISHMENTS'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/admin/notifications/history');
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load notification broadcast history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      addToast({
        type: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha o título e a mensagem da notificação.',
      });
      return;
    }

    try {
      setIsSending(true);
      const res = await api.post('/admin/notifications/broadcast', {
        title: title.trim(),
        message: message.trim(),
        audience,
      });

      addToast({
        type: 'success',
        title: 'Notificações disparadas',
        message: res.data.message || 'Disparo concluído com sucesso.',
      });

      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Falha no disparo',
        message: err.response?.data?.error || 'Erro ao enviar notificação.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
          <Bell size={24} className="text-orange-500" />
          <span>Central de Comunicação Interna</span>
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Envio de alertas e comunicados oficiais persistentes para os públicos da plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Send size={18} className="text-orange-500" />
            <span>Nova Transmissão</span>
          </h2>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Público-Alvo
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white focus:outline-hidden"
              >
                <option value="ALL">Todos os Usuários da Plataforma</option>
                <option value="TUTORS">Apenas Tutores</option>
                <option value="PROFESSIONALS">Apenas Profissionais Autônomos</option>
                <option value="ESTABLISHMENTS">Apenas Estabelecimentos</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Título do Comunicado
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manutenção programada do sistema"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Mensagem
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a mensagem clara que aparecerá no centro de notificações..."
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden resize-none"
              />
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-1 text-neutral-500">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                Alcance Imediato
              </span>
              <p className="text-[11px] leading-relaxed">
                As notificações serão inseridas diretamente no banco de dados e sincronizadas nos sinos do cabeçalho de cada destinatário.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={15} />
              <span>{isSending ? 'Enviando...' : 'Transmitir Notificação'}</span>
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <History size={18} className="text-orange-500" />
              <span>Histórico de Transmissões</span>
            </h2>
            <span className="text-xs text-neutral-400">
              {history.length} disparo(s) registrado(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Título / Detalhes</th>
                  <th className="px-4 py-3">Público</th>
                  <th className="px-4 py-3">Destinatários</th>
                  <th className="px-4 py-3">Disparado por</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-neutral-400 text-xs">
                      Carregando histórico de comunicados...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-neutral-400 text-xs">
                      Nenhuma transmissão interna registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-neutral-900 dark:text-white block">
                          {h.details?.title || 'Comunicado do Sistema'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#131314] font-semibold text-[10px] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-[#313335]">
                          {h.details?.audience || 'ALL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-neutral-900 dark:text-white">
                        {h.details?.recipientsCount || 0} usuário(s)
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                        {h.admin?.name || 'Administrador'}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(h.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(h.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
