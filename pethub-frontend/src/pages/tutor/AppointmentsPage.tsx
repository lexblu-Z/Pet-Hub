import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, X } from 'lucide-react';
import { api } from '@/services/api';
import { Tabs, Badge, EmptyState } from '@/components/ui';
import { GoogleCalendarPromptModal } from '@/components/shared/GoogleCalendarPromptModal';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';
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

        // Only offer to connect if NOT already connected
        if (!statusRes.data.isConnected) {
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
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Agendamentos</h1>
          <p className="text-neutral-500 text-sm">Gerencie suas consultas, vacinas e procedimentos</p>
        </div>

        {/* Discreet Google Calendar Action/Badge */}
        {googleStatus?.isConnected ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Google Calendar conectado</span>
              <button
                onClick={() => setShowManageModal(true)}
                className="text-emerald-800 hover:text-emerald-950 font-bold ml-1.5 underline underline-offset-2 cursor-pointer"
              >
                Gerenciar
              </button>
            </span>
          </div>
        ) : (
          <button
            onClick={() => setShowPromptModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 hover:text-orange-600 bg-white hover:bg-orange-50/60 border border-neutral-200 hover:border-orange-200 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
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
              className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${apt.serviceCategory === 'consulta' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    {apt.serviceCategory === 'consulta' ? '🩺' : '✂️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">{apt.serviceName}</h3>
                    <p className="text-sm text-neutral-500">{apt.establishmentName}</p>
                  </div>
                </div>
                <Badge variant={statusConfig[apt.status].variant}>
                  {statusConfig[apt.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-neutral-50 rounded-xl mb-3">
                <div>
                  <p className="text-xs text-neutral-400 mb-1">🐾 Pet</p>
                  <p className="text-sm font-semibold">{apt.petName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-1">📅 Data</p>
                  <p className="text-sm font-semibold">{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-1">⏰ Horário</p>
                  <p className="text-sm font-semibold">{apt.time}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-1">💰 Valor</p>
                  <p className="text-sm font-semibold">R${apt.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-orange-500 font-medium">
                Ver detalhes <ChevronRight size={16} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-neutral-100 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-900">Configuração do Google Calendar</h2>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  api.get('/google/status').then(res => setGoogleStatus(res.data)).catch(() => {});
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors cursor-pointer"
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
