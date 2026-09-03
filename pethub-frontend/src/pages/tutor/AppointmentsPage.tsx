import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, XCircle } from 'lucide-react';
import { api } from '@/services/api';
import { Tabs, Badge, EmptyState } from '@/components/ui';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';

const statusConfig = {
  CONFIRMED: { label: 'Confirmado', variant: 'success' as const },
  PENDING: { label: 'Pendente', variant: 'warning' as const },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info' as const },
  COMPLETED: { label: 'Concluído', variant: 'success' as const },
  CANCELLED: { label: 'Cancelado', variant: 'error' as const },
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    loadAppointments();
  }, []);

  const myAppointments = appointments.sort((a, b) => b.date.localeCompare(a.date));

  const upcomingApts = myAppointments.filter(a => ['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(a.status));
  const pastApts = myAppointments.filter(a => ['COMPLETED', 'CANCELLED'].includes(a.status));

  const tabs = [
    { id: 'upcoming', label: 'Próximos', badge: upcomingApts.length },
    { id: 'past', label: 'Histórico' },
    { id: 'google', label: '🗓️ Google Calendar' },
  ];

  const displayedApts = activeTab === 'upcoming' ? upcomingApts : pastApts;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Agendamentos</h1>
        <p className="text-neutral-500 text-sm">Gerencie seus agendamentos, histórico e integração com Google Calendar</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'google' ? (
        <GoogleCalendarCard
          returnTo="/tutor/appointments?tab=google"
          roleTitle="as consultas e procedimentos dos seus pets"
        />
      ) : displayedApts.length === 0 ? (
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
    </div>
  );
}
