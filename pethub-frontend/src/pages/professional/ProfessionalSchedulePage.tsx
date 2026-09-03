import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, Search } from 'lucide-react';
import { Button, Badge, Input, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

interface Appointment {
  id: string;
  time: string;
  date: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petPhoto: string | null;
  tutorName: string;
  tutorPhone: string | null;
  tutorPhoto: string | null;
  service: string;
  price: number;
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

const statusConfig: Record<string, { label: string; badge: 'warning' | 'info' | 'brand' | 'success' | 'error' }> = {
  PENDING: { label: 'Agendado', badge: 'warning' },
  CONFIRMED: { label: 'Confirmado', badge: 'info' },
  IN_PROGRESS: { label: 'Em Andamento', badge: 'brand' },
  COMPLETED: { label: 'Concluído', badge: 'success' },
  CANCELLED: { label: 'Cancelado', badge: 'error' },
};

export default function ProfessionalSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/professional/appointments?date=${selectedDate}&status=${statusFilter}`);
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      await api.put(`/professional/appointments/${id}/status`, { status: newStatus });
      toast.success('Status do atendimento atualizado!');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      toast.error('Erro ao atualizar status do atendimento.');
    }
  };

  const filtered = appointments.filter(a => {
    const matchesSearch = !search || 
      a.petName.toLowerCase().includes(search.toLowerCase()) ||
      a.tutorName.toLowerCase().includes(search.toLowerCase()) ||
      a.service.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header - Identical to Establishment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Minha Agenda</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Gerencie consultas, atendimentos clínicos e procedimentos com dados reais do banco</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Search & Filter bar - Identical to Establishment */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por paciente, tutor ou procedimento..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Agendados' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'IN_PROGRESS', label: 'Em Andamento' },
            { id: 'COMPLETED', label: 'Concluídos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all font-medium ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List - Matching Establishment Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando seus atendimentos do banco...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
            <CalendarIcon size={40} className="mx-auto text-neutral-300 mb-3" />
            <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum agendamento encontrado</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Assim que tutores realizarem agendamentos com você, eles aparecerão aqui com dados reais.
            </p>
          </div>
        ) : (
          filtered.map((apt) => {
            const status = statusConfig[apt.status] || statusConfig.PENDING;

            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4 hover:border-orange-200 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Time & Service */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 text-orange-700 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border border-orange-100">
                      <Clock size={16} />
                      <span className="text-xs mt-0.5">{apt.time}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 text-base">{apt.service}</span>
                        <Badge variant={status.badge}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-neutral-800">
                          <Clock size={12} className="text-orange-500" /> {apt.duration} min
                        </span>
                        <span>•</span>
                        <span className="font-bold text-green-700">R$ {apt.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pet and Tutor details */}
                  <div className="flex items-center gap-6 text-xs">
                    {/* Pet */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 flex items-center justify-center text-sm">
                        {apt.petPhoto ? (
                          <img src={apt.petPhoto} alt={apt.petName} className="w-full h-full object-cover" />
                        ) : (
                          '🐾'
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{apt.petName}</p>
                        <p className="text-[11px] text-neutral-400">{apt.petSpecies} {apt.petBreed ? `• ${apt.petBreed}` : ''}</p>
                      </div>
                    </div>

                    {/* Tutor */}
                    <div className="flex items-center gap-2.5 border-l border-neutral-100 pl-4">
                      <Avatar src={apt.tutorPhoto || '/user.jpg'} name={apt.tutorName} size="sm" fallbackSrc="/user.jpg" />
                      <div>
                        <p className="font-bold text-neutral-900">{apt.tutorName}</p>
                        <p className="text-[11px] text-neutral-400">{apt.tutorPhone || 'Tutor'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100">
                    {apt.status === 'PENDING' && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                      >
                        Confirmar
                      </Button>
                    )}
                    {apt.status === 'CONFIRMED' && (
                      <Button
                        size="xs"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                      >
                        Iniciar Atendimento
                      </Button>
                    )}
                    {apt.status === 'IN_PROGRESS' && (
                      <Button
                        size="xs"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                      >
                        <CheckCircle size={14} className="mr-1" /> Concluir Atendimento
                      </Button>
                    )}
                    {apt.status === 'COMPLETED' && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                        Atendimento Finalizado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
