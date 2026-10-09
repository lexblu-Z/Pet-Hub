import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, X, Plus, Stethoscope, Scissors, PawPrint, DollarSign, Flag } from 'lucide-react';
import { api } from '@/services/api';
import { Tabs, Badge, EmptyState, Modal, Button } from '@/components/ui';
import { GoogleCalendarPromptModal } from '@/components/shared/GoogleCalendarPromptModal';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';
import { GoogleCalendarViewModal } from '@/components/shared/GoogleCalendarViewModal';
import { ReportModal } from '@/components/shared/ReportModal';
import { useToast } from '@/store/toastStore';
import { useBookingStore } from '@/store/bookingStore';
import { formatAppointmentTime, formatBrasiliaDate } from '@/utils/date';
import { ServiceLogo } from '@/components/shared/ServiceLogo';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' }> = {
  CONFIRMED: { label: 'Confirmado', variant: 'success' },
  PENDING: { label: 'Pendente', variant: 'warning' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'error' },
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [reportModalData, setReportModalData] = useState<{
    targetType: 'ESTABLISHMENT' | 'PROFESSIONAL';
    targetId?: string;
    targetName: string;
    appointmentId: string;
  } | null>(null);

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
        setAppointments(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erro ao carregar agendamentos:', err);
        setAppointments([]);
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

  const myAppointments = [...appointments].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });

  const upcomingApts = myAppointments.filter(a => ['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(a.status));
  const pastApts = myAppointments.filter(a => ['COMPLETED', 'CANCELLED'].includes(a.status));

  const tabs = [
    { id: 'upcoming', label: 'Próximos', badge: upcomingApts.length },
    { id: 'past', label: 'Histórico' },
  ];

  const displayedApts = activeTab === 'upcoming' ? upcomingApts : pastApts;

  const getStatusObj = (status: string) => {
    return statusConfig[status] || { label: status || 'Agendado', variant: 'warning' as const };
  };

  const getFormattedDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return 'Data a definir';
    return formatBrasiliaDate(String(dateVal));
  };

  const getFormattedTime = (apt: any) => {
    return formatAppointmentTime(apt);
  };

  const handleNewBooking = () => {
    useBookingStore.getState().reset();
    navigate('/tutor/booking');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 font-sans relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Agendamentos</h1>
          <p className="text-neutral-500 dark:text-[#C4C7C5] text-sm">Gerencie suas consultas, vacinas e procedimentos</p>
        </div>

        {/* Google Calendar Action/Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {googleStatus?.isConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFullCalendarModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-[#282A2C] dark:hover:bg-[#313335] text-neutral-700 dark:text-[#E3E3E3] border border-neutral-200 dark:border-[#383A3C] shadow-xs transition-colors cursor-pointer"
              >
                <Calendar size={14} className="text-orange-500" />
                <span>Ver agenda Google</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Google conectado</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-600 bg-white dark:bg-[#1E1F20] hover:bg-orange-50/60 dark:hover:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] hover:border-orange-200 dark:hover:border-orange-500/40 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <Calendar size={14} className="text-orange-500" />
              <span>Sincronizar Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Action Button below Tabs */}
      <div className="flex items-center">
        <Button
          onClick={handleNewBooking}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-orange-500/25 active:scale-95"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>Fazer novo agendamento</span>
        </Button>
      </div>

      {displayedApts.length === 0 ? (
        <EmptyState
          imageUrl={activeTab === 'upcoming' ? '/zeca_macaque_1788367569922.jpg' : '/beicinho_pitbull_1788367520420.jpg'}
          title={activeTab === 'upcoming' ? 'Nenhum agendamento futuro' : 'Nenhum histórico'}
          description={activeTab === 'upcoming' ? 'Nenhum agendamento por aqui ainda. Que tal marcar um horário?' : 'Você ainda não realizou nenhum serviço.'}
          action={{ label: 'Fazer novo agendamento', onClick: handleNewBooking }}
        />
      ) : (
        <div className="space-y-4">
          {displayedApts.map((apt, i) => {
            const serviceName = apt.service?.name || apt.serviceName || 'Serviço';
            const providerName =
              apt.professional?.name
                ? `Dr(a). ${apt.professional.name}`
                : apt.establishment?.establishmentProfile?.businessName ||
                  apt.establishment?.name ||
                  apt.establishmentName ||
                  'Prestador';
            const petName = apt.pet?.name || apt.petName || 'Pet';
            const price = Number(apt.service?.price ?? apt.price ?? 0);
            const statusObj = getStatusObj(apt.status);
            const dateDisplay = getFormattedDate(apt.date);
            const timeDisplay = getFormattedTime(apt);
            const isConsultation =
              apt.serviceCategory === 'consulta' ||
              apt.service?.category?.toLowerCase() === 'consulta' ||
              apt.service?.category?.toLowerCase() === 'veterinary';

            return (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAppointment(apt)}
                className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/40 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ServiceLogo
                      category={apt.serviceCategory || apt.service?.category}
                      name={serviceName}
                      size="md"
                      showBadge={true}
                      className="w-12 h-12"
                    />
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{serviceName}</h3>
                      <p className="text-sm text-neutral-500 dark:text-[#C4C7C5]">
                        {providerName} • <span className="font-medium text-orange-600 dark:text-orange-400">{apt.petTransport === 'PICKUP_BY_PROVIDER' ? 'Buscar pet' : 'Tutor levará o pet'}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusObj.variant}>
                    {statusObj.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-xl mb-3">
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1">
                      <PawPrint size={12} /> Pet
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-1.5">
                      <SpeciesIcon speciesId={apt.pet?.species} size={14} className="text-orange-500 shrink-0" />
                      <span>{petName}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1">
                      <Calendar size={12} /> Data
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{dateDisplay}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1">
                      <Clock size={12} /> Horário
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{timeDisplay}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1">
                      <DollarSign size={12} /> Valor
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">R${price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-neutral-50 dark:border-[#313335]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isProf = !!apt.professional?.id || !!apt.professionalId;
                      setReportModalData({
                        targetType: isProf ? 'PROFESSIONAL' : 'ESTABLISHMENT',
                        targetId: apt.professional?.id || apt.professionalId || apt.establishment?.id || apt.establishmentId,
                        targetName: isProf
                          ? (apt.professional?.name || 'Profissional')
                          : (apt.establishment?.establishmentProfile?.businessName || apt.establishment?.name || 'Estabelecimento'),
                        appointmentId: apt.id,
                      });
                    }}
                    className="text-xs text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Denunciar prestador"
                  >
                    <Flag size={13} />
                    <span>Denunciar</span>
                  </button>
                  <span className="text-orange-500 font-medium inline-flex items-center gap-1">
                    Ver detalhes <ChevronRight size={16} />
                  </span>
                </div>
              </motion.div>
            );
          })}

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

      {/* Modal de Detalhes do Agendamento */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title="Detalhes do Agendamento"
          size="md"
        >
          <div className="space-y-4 text-sm font-sans">
            {/* Header do Agendamento */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335]">
              <div className="flex items-center gap-3">
                <ServiceLogo
                  category={selectedAppointment.serviceCategory || selectedAppointment.service?.category}
                  name={selectedAppointment.service?.name || selectedAppointment.serviceName}
                  size="sm"
                  showBadge={true}
                />
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3]">
                    {selectedAppointment.service?.name || selectedAppointment.serviceName || 'Serviço'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                    {selectedAppointment.professional?.name
                      ? `Dr(a). ${selectedAppointment.professional.name}`
                      : selectedAppointment.establishment?.establishmentProfile?.businessName ||
                        selectedAppointment.establishment?.name ||
                        selectedAppointment.establishmentName ||
                        'Prestador'}
                  </p>
                </div>
              </div>
              <Badge variant={getStatusObj(selectedAppointment.status).variant}>
                {getStatusObj(selectedAppointment.status).label}
              </Badge>
            </div>

            {/* Informações detalhadas */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-100 dark:border-[#313335]">
                <p className="text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1">
                  <PawPrint size={12} /> Pet Atendido
                </p>
                <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3] text-sm flex items-center gap-1.5">
                  <SpeciesIcon speciesId={selectedAppointment.pet?.species} size={14} className="text-orange-500 shrink-0" />
                  <span>{selectedAppointment.pet?.name || selectedAppointment.petName || 'Pet'}</span>
                </p>
                {selectedAppointment.pet?.breed && (
                  <p className="text-neutral-500 dark:text-[#8E918F] text-[11px]">{selectedAppointment.pet.breed}</p>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-100 dark:border-[#313335]">
                <p className="text-neutral-400 dark:text-[#8E918F] mb-1 flex items-center gap-1.5">
                  <PaymentLogo method="dinheiro" size="xs" /> Valor Total
                </p>
                <p className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                  R${Number(selectedAppointment.service?.price ?? selectedAppointment.price ?? 0).toFixed(2)}
                </p>
                <p className="text-neutral-400 dark:text-[#8E918F] text-[11px]">Pagamento no local</p>
              </div>
            </div>

            {/* Data, Horário e Local */}
            <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-700 dark:text-[#E3E3E3]">
                <Calendar size={15} className="text-orange-500 shrink-0" />
                <span className="font-medium">{getFormattedDate(selectedAppointment.date)}</span>
                <span className="text-neutral-300 dark:text-[#8E918F]">|</span>
                <Clock size={15} className="text-orange-500 shrink-0" />
                <span className="font-medium">{getFormattedTime(selectedAppointment)}</span>
              </div>

              {(selectedAppointment.establishment?.establishmentProfile?.address ||
                selectedAppointment.professional?.professionalProfile?.address) && (
                <div className="flex items-start gap-2 text-neutral-600 dark:text-[#C4C7C5] pt-1 border-t border-neutral-100 dark:border-[#313335]">
                  <MapPin size={15} className="text-orange-500 shrink-0 mt-0.5" />
                  <span>
                    {selectedAppointment.establishment?.establishmentProfile?.address ||
                      selectedAppointment.professional?.professionalProfile?.address}
                  </span>
                </div>
              )}
            </div>

            {/* Transporte do Pet */}
            <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-100 dark:border-[#313335] text-xs">
              <span className="text-neutral-400 dark:text-[#8E918F] block text-[11px] mb-0.5">Transporte do Pet</span>
              <span className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                {selectedAppointment.petTransport === 'PICKUP_BY_PROVIDER'
                  ? 'Solicitado busca do pet pelo prestador'
                  : 'O tutor levará o pet ao local'}
              </span>
            </div>

            {/* Ações e Denúncia */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 dark:border-[#313335]">
              <div className="flex items-center gap-2 flex-wrap">
                {(selectedAppointment.professional?.id || selectedAppointment.professionalId) && (
                  <button
                    type="button"
                    onClick={() => setReportModalData({
                      targetType: 'PROFESSIONAL',
                      targetId: selectedAppointment.professional?.id || selectedAppointment.professionalId,
                      targetName: selectedAppointment.professional?.name || 'Profissional',
                      appointmentId: selectedAppointment.id,
                    })}
                    className="text-xs text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Flag size={13} />
                    <span>Denunciar Profissional</span>
                  </button>
                )}
                {(selectedAppointment.establishment?.id || selectedAppointment.establishmentId) && (
                  <button
                    type="button"
                    onClick={() => setReportModalData({
                      targetType: 'ESTABLISHMENT',
                      targetId: selectedAppointment.establishment?.id || selectedAppointment.establishmentId,
                      targetName: selectedAppointment.establishment?.establishmentProfile?.businessName || selectedAppointment.establishment?.name || 'Estabelecimento',
                      appointmentId: selectedAppointment.id,
                    })}
                    className="text-xs text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Flag size={13} />
                    <span>Denunciar Estabelecimento</span>
                  </button>
                )}
              </div>
              <Button onClick={() => setSelectedAppointment(null)} className="w-full sm:w-auto">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-20 right-4 z-40">
        <button
          onClick={handleNewBooking}
          className="flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-full shadow-lg shadow-orange-500/30 transition-all cursor-pointer active:scale-95"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>Novo agendamento</span>
        </button>
      </div>

      {/* Report Modal */}
      {reportModalData && (
        <ReportModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          targetType={reportModalData.targetType}
          reportedUserId={reportModalData.targetType === 'PROFESSIONAL' ? reportModalData.targetId : undefined}
          reportedEstablishmentId={reportModalData.targetType === 'ESTABLISHMENT' ? reportModalData.targetId : undefined}
          targetName={reportModalData.targetName}
          contextType="APPOINTMENT"
          contextId={reportModalData.appointmentId}
        />
      )}
    </div>
  );
}
