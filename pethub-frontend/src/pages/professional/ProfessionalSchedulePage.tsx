import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, PawPrint, CheckCircle, Search } from 'lucide-react';
import { Button, Badge, Input } from '@/components/ui';

interface Appointment {
  id: string;
  time: string;
  date: string;
  petName: string;
  petBreed: string;
  tutorName: string;
  service: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export default function ProfessionalSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-1',
      time: '09:30',
      date: new Date().toISOString().split('T')[0],
      petName: 'Thor',
      petBreed: 'Golden Retriever',
      tutorName: 'Mariana Silva',
      service: 'Consulta Veterinária Geral',
      status: 'CONFIRMED',
      notes: 'Avaliação de rotina e checagem de vacinas.',
    },
    {
      id: 'apt-2',
      time: '11:00',
      date: new Date().toISOString().split('T')[0],
      petName: 'Luna',
      petBreed: 'Siamês',
      tutorName: 'Carlos Eduardo',
      service: 'Aplicação de Vacina V4',
      status: 'CONFIRMED',
      notes: 'Animal um pouco arredio.',
    },
    {
      id: 'apt-3',
      time: '14:00',
      date: new Date().toISOString().split('T')[0],
      petName: 'Bob',
      petBreed: 'Poodle',
      tutorName: 'Ana Beatriz',
      service: 'Retorno Ortopédico',
      status: 'PENDING',
      notes: 'Checagem pós-cirúrgica da pata traseira.',
    },
  ]);

  const handleStatusChange = (id: string, newStatus: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  const filtered = appointments.filter(a => {
    const matchesFilter = filter === 'ALL' || a.status === filter;
    const matchesSearch = !search || 
      a.petName.toLowerCase().includes(search.toLowerCase()) ||
      a.tutorName.toLowerCase().includes(search.toLowerCase()) ||
      a.service.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Minha Agenda</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Gerencie consultas, atendimentos clínicos e procedimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por paciente, tutor ou serviço..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'COMPLETED', label: 'Concluídos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
            <CalendarIcon size={40} className="mx-auto text-neutral-300 mb-3" />
            <h3 className="font-bold text-neutral-800 text-sm mb-1">Nenhum agendamento para este filtro</h3>
            <p className="text-xs text-neutral-400">Novos agendamentos agendados por tutores aparecerão aqui.</p>
          </div>
        ) : (
          filtered.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-teal-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex flex-col items-center justify-center shrink-0">
                  <Clock size={16} />
                  <span className="font-bold text-xs mt-0.5">{apt.time}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-neutral-900 text-base flex items-center gap-1.5">
                      <PawPrint size={16} className="text-teal-600" />
                      {apt.petName}
                    </h3>
                    <span className="text-xs text-neutral-400 font-normal">({apt.petBreed})</span>
                    {apt.status === 'CONFIRMED' && <Badge variant="success">✓ Confirmado</Badge>}
                    {apt.status === 'PENDING' && <Badge variant="warning">⏳ Pendente</Badge>}
                    {apt.status === 'COMPLETED' && <Badge variant="default">Finalizado</Badge>}
                  </div>
                  <p className="text-xs font-semibold text-teal-700 mt-0.5">{apt.service}</p>
                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <User size={13} className="text-neutral-400" />
                    Tutor: <span className="font-medium text-neutral-700">{apt.tutorName}</span>
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-neutral-400 italic mt-1 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-100 inline-block">
                      Obs: {apt.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                {apt.status !== 'COMPLETED' && (
                  <Button
                    size="xs"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                  >
                    <CheckCircle size={14} className="mr-1" /> Concluir Atendimento
                  </Button>
                )}
                {apt.status === 'PENDING' && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
