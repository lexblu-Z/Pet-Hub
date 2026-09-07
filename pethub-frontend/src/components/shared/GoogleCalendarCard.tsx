import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Clock,
  LogOut,
  ChevronDown,
  ChevronUp,
  PawPrint,
  Lock,
} from 'lucide-react';
import { Button, Badge, Modal } from '@/components/ui';

interface GoogleStatus {
  isConnected: boolean;
  googleEmail: string | null;
  calendarId: string | null;
  calendarName: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
}

interface SyncLog {
  id: string;
  action: string;
  status: string;
  title: string;
  details: string | null;
  createdAt: string;
}

interface GoogleCalendarCardProps {
  returnTo: string;
  roleTitle?: string;
}

export const GoogleCalendarCard: React.FC<GoogleCalendarCardProps> = ({
  returnTo,
  roleTitle = 'seus agendamentos',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creatingCal, setCreatingCal] = useState(false);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check URL query parameters after OAuth redirect
  useEffect(() => {
    const syncParam = searchParams.get('google_sync');
    if (syncParam === 'success') {
      toast.success('Google Calendar conectado e sincronizado com sucesso!');
      searchParams.delete('google_sync');
      setSearchParams(searchParams, { replace: true });
    } else if (syncParam === 'error') {
      toast.error('Não foi possível conectar ao Google Calendar. Tente novamente.');
      searchParams.delete('google_sync');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Load Status
  const fetchStatus = async () => {
    try {
      const res = await api.get('/google/status');
      setStatus(res.data);
      if (res.data.isConnected) {
        loadCalendars();
        loadLogs();
      }
    } catch (err) {
      console.error('Error fetching Google status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      const res = await api.get('/google/calendars');
      setCalendars(res.data);
    } catch {
      // Graceful fallback
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.get('/google/logs');
      setLogs(res.data);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Connect via OAuth
  const handleConnect = async () => {
    try {
      const res = await api.get(`/google/auth-url?returnTo=${encodeURIComponent(returnTo)}`);
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error('Erro ao iniciar conexão com Google Calendar.');
    }
  };

  // Select Calendar
  const handleSelectCalendar = async (calId: string) => {
    const selected = calendars.find((c) => c.id === calId);
    try {
      await api.post('/google/select-calendar', {
        calendarId: calId,
        calendarName: selected?.summary || calId,
      });
      toast.success(`Agenda alterada para "${selected?.summary || calId}"`);
      fetchStatus();
    } catch {
      toast.error('Erro ao alterar agenda do Google.');
    }
  };

  // Create PetHub Calendar
  const handleCreatePetHubCalendar = async () => {
    setCreatingCal(true);
    try {
      await api.post('/google/create-pethub-calendar');
      toast.success('Agenda "PetHub — Agendamentos" criada e ativada no seu Google!');
      fetchStatus();
    } catch {
      toast.error('Erro ao criar agenda no Google.');
    } finally {
      setCreatingCal(false);
    }
  };

  // Manual Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/google/sync-now');
      toast.success(res.data.message || 'Sincronização concluída!');
      fetchStatus();
    } catch {
      toast.error('Erro ao sincronizar com Google Calendar.');
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/google/disconnect');
      toast.success('Google Calendar desconectado com sucesso.');
      setShowDisconnectModal(false);
      setStatus({
        isConnected: false,
        googleEmail: null,
        calendarId: null,
        calendarName: null,
        syncEnabled: false,
        lastSyncAt: null,
      });
      setLogs([]);
      setCalendars([]);
    } catch {
      toast.error('Erro ao desconectar Google Calendar.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-6 border border-neutral-200/80 dark:border-[#313335] shadow-xs flex items-center justify-center text-neutral-400 dark:text-[#8E918F] gap-3">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Verificando status do Google Calendar...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] shadow-xs overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-6 sm:p-7 border-b border-neutral-100 dark:border-[#313335] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Official Google Calendar icon style */}
          <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar size={24} className="text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">Google Calendar</h3>
              {status?.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Conectado
                </span>
              ) : (
                <Badge variant="default">Desconectado</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] mt-1">
              Sincronize {roleTitle} automaticamente com sua agenda do Google.
            </p>
          </div>
        </div>

        {/* Action button */}
        {!status?.isConnected ? (
          <Button
            onClick={handleConnect}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-xs flex items-center gap-2 shrink-0"
          >
            <Calendar size={16} />
            <span>Conectar Google Calendar</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar agora'}</span>
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowDisconnectModal(true)}
              className="text-neutral-400 dark:text-[#8E918F] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
            >
              <LogOut size={14} className="mr-1" /> Desconectar
            </Button>
          </div>
        )}
      </div>

      {/* Connected State Content */}
      {status?.isConnected ? (
        <div className="p-6 sm:p-7 space-y-6 bg-neutral-50/50 dark:bg-[#1E1F20]">
          {/* Account Details & Calendar Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Info */}
            <div className="bg-white dark:bg-[#282A2C] p-4 rounded-2xl border border-neutral-200/80 dark:border-[#313335] shadow-2xs space-y-2">
              <span className="text-[11px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                Conta Google Conectada
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {status.googleEmail?.slice(0, 1).toUpperCase() || 'G'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm truncate">{status.googleEmail}</p>
                  <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                    Última sincronização:{' '}
                    {status.lastSyncAt
                      ? new Date(status.lastSyncAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recente'}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Calendar Selector */}
            <div className="bg-white dark:bg-[#282A2C] p-4 rounded-2xl border border-neutral-200/80 dark:border-[#313335] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                  Agenda de Destino
                </span>
                <button
                  onClick={handleCreatePetHubCalendar}
                  disabled={creatingCal}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold flex items-center gap-1 transition-colors"
                  title="Criar uma agenda exclusiva no Google"
                >
                  <PlusCircle size={13} />
                  <span>{creatingCal ? 'Criando...' : 'Criar agenda PetHub'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={status.calendarId || 'primary'}
                  onChange={(e) => handleSelectCalendar(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="primary">Agenda Principal ({status.googleEmail})</option>
                  {calendars
                    .filter((c) => !c.primary)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.summary}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sync History / Logs Toggle */}
          <div className="border border-neutral-200/80 dark:border-[#313335] rounded-2xl bg-white dark:bg-[#282A2C] overflow-hidden shadow-2xs">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-50/80 dark:hover:bg-[#313335] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-neutral-400 dark:text-[#8E918F]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3]">
                  Histórico de Sincronizações Recentes ({logs.length})
                </span>
              </div>
              {showLogs ? <ChevronUp size={16} className="text-neutral-400 dark:text-[#8E918F]" /> : <ChevronDown size={16} className="text-neutral-400 dark:text-[#8E918F]" />}
            </button>

            {showLogs && (
              <div className="p-4 border-t border-neutral-100 dark:border-[#313335] max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335] text-xs">
                {logs.length === 0 ? (
                  <p className="text-neutral-400 dark:text-[#8E918F] text-center py-4">Nenhum registro de sincronização ainda.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{log.title}</p>
                          {log.details && <p className="text-neutral-500 dark:text-[#C4C7C5] text-[11px] mt-0.5">{log.details}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Disconnected State Benefits List */
        <div className="p-6 sm:p-7 bg-neutral-50/50 dark:bg-[#1E1F20] space-y-3">
          <p className="text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider">Como funciona:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600 dark:text-[#C4C7C5]">
            <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-neutral-200/60 dark:border-[#313335] shadow-2xs">
              <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <PawPrint size={14} className="text-orange-500" />
                100% Automático
              </span>
              Agendamentos confirmados ou alterados no PetHub refletem no seu calendário.
            </div>
            <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-neutral-200/60 dark:border-[#313335] shadow-2xs">
              <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <Lock size={14} className="text-orange-500" />
                Seguro & Privado
              </span>
              Seus dados pessoais permanecem protegidos com autenticação oficial Google OAuth 2.0.
            </div>
            <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-neutral-200/60 dark:border-[#313335] shadow-2xs">
              <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-1.5 mb-1">
                <Calendar size={14} className="text-orange-500" />
                Total Flexibilidade
              </span>
              Use sua agenda principal ou crie uma agenda exclusiva PetHub com 1 clique.
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <Modal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          title="Desconectar Google Calendar?"
          size="sm"
        >
          <div className="space-y-4 text-sm font-sans">
            <p className="text-neutral-600 dark:text-[#C4C7C5] text-xs sm:text-sm leading-relaxed">
              Tem certeza que deseja desconectar sua conta Google?
            </p>
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <p className="font-bold">Atenção:</p>
              <p>• Os próximos agendamentos deixarão de ser sincronizados automaticamente.</p>
              <p>• Os eventos já criados no seu Google Calendar serão mantidos para seu histórico.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnecting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? 'Desconectando...' : 'Sim, Desconectar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
