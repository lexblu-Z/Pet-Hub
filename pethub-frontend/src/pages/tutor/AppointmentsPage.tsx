import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, X, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import { Tabs, Badge, EmptyState } from '@/components/ui';
import { GoogleCalendarPromptModal } from '@/components/shared/GoogleCalendarPromptModal';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';
import { GoogleCalendarViewModal } from '@/components/shared/GoogleCalendarViewModal';
import { useToast } from '@/store/toastStore';

const statusConfig = {
  CONFIRMED: { label: 'Confirmado', variant: 'success' as const },
  PENDING: { label: 'Pendente', variant: 'warning' as const },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info' as const },
  COMPLETED: { label: 'Concluído', variant: 'success' as const },
  CANCELLED: { label: 'Cancelado', variant: 'error' as const },
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Google Calendar Integration states
  const [googleStatus, setGoogleStatus] = useState<{ isConnected: boolean; googleEmail?: string } | null>(null);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [showFullCalendarModal, setShowFullCalendarModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const response = await api.get('/appointments/me');
        setAppointments(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const checkGoogleAndPrefs = async () => {
      try {
        const statusRes = await api.get('/google/status');
        setGoogleStatus(statusRes.data);

        if (statusRes.data.isConnected) {
          api.get('/google/events')
            .then(res => setGoogleEvents(res.data?.events || []))
            .catch(err => console.error('Failed to load Google events:', err));
        } else {
          const prefsRes = await api.get('/users/me/preferences').catch(() => ({ data: {} }));
          const promptEnabled = prefsRes.data?.googleCalendarPrompt !== false;
          const dismissedInSession = sessionStorage.getItem('@PetHub:dismissedGoogleModal') === 'true';

          if (promptEnabled && !dismissedInSession) {
            setShowPromptModal(true);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status do Google Calendar:', err);
      }
    };

    loadAppointments();
    checkGoogleAndPrefs();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const res = await api.get('/google/auth-url?returnTo=/tutor/appointments');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error('Erro ao iniciar conexão com Google Calendar.');
      setIsConnecting(false);
    }
  };

  const handleDismissSession = () => {
    sessionStorage.setItem('@PetHub:dismissedGoogleModal', 'true');
    setShowPromptModal(false);
  };

  const handleNeverShowAgain = async () => {
    setShowPromptModal(false);
    try {
      await api.put('/users/me/preferences', { googleCalendarPrompt: false });
      toast.info('Opção salva. Você pode reativar a qualquer momento em Configurações > Preferências.');
    } catch (err) {
      console.error(err);
    }
  };

  const myAppointments = appointments.sort((a, b) => b.date.localeCompare(a.date));
  const upcomingApts = myAppointments.filter(a => ['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(a.status));
  const pastApts = myAppointments.filter(a => ['COMPLETED', 'CANCELLED'].includes(a.status));

  const externalGoogleEvents = googleEvents
    .filter(ev => !ev.isPetHub && ev.start)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  // Only the official PetHub Schedule Tabs (NO Google Calendar tab here)
  const tabs = [
    { id: 'upcoming', label: 'Próximos', badge: upcomingApts.length },
    { id: 'past', label: 'Histórico' },
  ];

  const displayedApts = activeTab === 'upcoming' ? upcomingApts : pastApts;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Agendamentos</h1>
          <p className="text-neutral-500 dark:text-[#C4C7C5] text-sm">Gerencie suas consultas, vacinas e procedimentos</p>
        </div>

        {/* Discreet Google Calendar Action/Badge */}
        {googleStatus?.isConnected ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFullCalendarModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Calendar size={14} />
              <span>Ver agenda completa</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Google Calendar conectado</span>
              <button
                onClick={() => setShowManageModal(true)}
                className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-bold ml-1.5 underline underline-offset-2 cursor-pointer"
              >
                Gerenciar
              </button>
            </span>
          </div>
        ) : (
          <button
            onClick={() => setShowPromptModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-600 bg-white dark:bg-[#1E1F20] hover:bg-orange-50/60 dark:hover:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] hover:border-orange-200 dark:hover:border-orange-500/40 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Calendar size={14} className="text-orange-500" />
            <span>Sincronizar com Google Calendar</span>
          </button>
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {displayedApts.length === 0 ? (
        <EmptyState
          imageUrl={activeTab === 'upcoming' ? '/zeca_macaque_1788367569922.jpg' : '/beicinho_pitbull_1788367520420.jpg'}
          title={activeTab === 'upcoming' ? 'Nenhum agendamento futuro' : 'Nenhum histórico'}
          description={activeTab === 'upcoming' ? 'Nenhum agendamento por aqui ainda 🐾 Que tal marcar um horário?' : 'Você ainda não realizou nenhum serviço.'}
          action={activeTab === 'upcoming' ? { label: 'Agendar um serviço', onClick: () => navigate('/tutor/booking') } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {displayedApts.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/tutor/appointments/${apt.id}`)}
              className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${apt.serviceCategory === 'consulta' ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-orange-50 dark:bg-orange-950/40'}`}>
                    {apt.serviceCategory === 'consulta' ? '🩺' : '✂️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.serviceName}</h3>
                    <p className="text-sm text-neutral-500 dark:text-[#C4C7C5]">{apt.establishmentName}</p>
                  </div>
                </div>
                <Badge variant={statusConfig[apt.status].variant}>
                  {statusConfig[apt.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-xl mb-3">
                <div>
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1">🐾 Pet</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{apt.petName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1">📅 Data</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1">⏰ Horário</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{apt.time}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1">💰 Valor</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">R${apt.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-orange-500 font-medium">
                Ver detalhes <ChevronRight size={16} />
              </div>
            </motion.div>
          ))}

          {/* External Google Calendar Events */}
          {activeTab === 'upcoming' && googleStatus?.isConnected && externalGoogleEvents.length > 0 && (
            <div className="pt-6 space-y-3 border-t border-neutral-200/60 dark:border-[#313335]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-[#E3E3E3]">
                    Outros compromissos da sua agenda Google
                  </h3>
                </div>
                <button
                  onClick={() => setShowFullCalendarModal(true)}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold hover:underline cursor-pointer"
                >
                  Ver todos na agenda completa →
                </button>
              </div>

              <div className="space-y-2.5">
                {externalGoogleEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100/70 dark:hover:bg-[#313335] rounded-2xl border border-neutral-200/70 dark:border-[#313335] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{ev.summary}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 shrink-0">
                            Google Calendar
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-[#C4C7C5] mt-0.5">
                          {ev.start ? new Date(ev.start).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Horário a definir'}
                          {ev.location ? ` • ${ev.location}` : ''}
                        </p>
                      </div>
                    </div>

                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-400 dark:text-[#8E918F] hover:text-blue-600 dark:hover:text-blue-400 font-medium shrink-0 flex items-center gap-1 p-1"
                        title="Abrir no Google Calendar"
                      >
                        Abrir <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Google Calendar Full View Modal */}
      <GoogleCalendarViewModal
        isOpen={showFullCalendarModal}
        onClose={() => setShowFullCalendarModal(false)}
        pethubAppointments={appointments}
      />

      {/* Google Calendar Optional Invitation Modal */}
      <GoogleCalendarPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onConnect={handleConnect}
        onDismissSession={handleDismissSession}
        onNeverShowAgain={handleNeverShowAgain}
        isLoading={isConnecting}
      />

      {/* Google Calendar Management Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-neutral-100 dark:border-[#313335] relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100 dark:border-[#313335]">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Configuração do Google Calendar</h2>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  api.get('/google/status').then(res => setGoogleStatus(res.data)).catch(() => {});
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-500 dark:text-[#C4C7C5] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <GoogleCalendarCard
              returnTo="/tutor/appointments"
              roleTitle="as consultas e procedimentos dos seus pets"
            />
          </div>
        </div>
      )}
    </div>
  );
}
