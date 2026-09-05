import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Calendar as CalendarIcon, Clock, PawPrint, User, CheckCircle, XCircle, AlertTriangle, Filter, Search, ChevronLeft, ChevronRight, Users, Play } from 'lucide-react';
import { Input, Button, Badge, Avatar } from '@/components/ui';

interface AppointmentData {
  id: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    photo: string | null;
  };
  tutor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  employee: {
    id: string;
    name: string;
    role: string;
  } | null;
}

const statusConfig: Record<string, { label: string; badge: 'warning' | 'info' | 'brand' | 'success' | 'error' }> = {
  PENDING: { label: 'Agendado', badge: 'warning' },
  CONFIRMED: { label: 'Confirmado', badge: 'info' },
  IN_PROGRESS: { label: 'Em Andamento', badge: 'brand' },
  COMPLETED: { label: 'Concluído', badge: 'success' },
  CANCELLED: { label: 'Cancelado', badge: 'error' },
};

export default function EstablishmentAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const toast = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/establishment/appointments');
      setAppointments(res.data);
      const empRes = await api.get('/establishment/employees');
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/establishment/appointments/${id}/status`, { status: newStatus });
      toast.success('Status do agendamento atualizado!');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar agendamento.');
    }
  };

  const handleAssignEmployee = async (appointmentId: string, employeeId: string) => {
    try {
      await api.put(`/establishment/appointments/${appointmentId}/assign-employee`, {
        employeeId: employeeId || null,
      });
      toast.success('Profissional atribuído com sucesso!');
      const emp = employees.find(e => e.id === employeeId);
      setAppointments(prev => prev.map(a => a.id === appointmentId ? {
        ...a,
        employee: emp ? { id: emp.id, name: emp.name, role: emp.role } : null
      } : a));
    } catch (err) {
      toast.error('Erro ao atribuir profissional.');
    }
  };

  const filtered = appointments.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      a.pet.name.toLowerCase().includes(q) ||
      a.tutor.name.toLowerCase().includes(q) ||
      a.service.name.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão de Agendamentos</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Organize os horários de banho, tosa e consultas veterinárias da sua equipe
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-orange-600 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>📋</span> Visão em lista
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-orange-600 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>📅</span> Visão em agenda
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por pet, tutor ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Agendados' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'IN_PROGRESS', label: 'Em Andamento' },
            { id: 'COMPLETED', label: 'Concluídos' },
            { id: 'CANCELLED', label: 'Cancelados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl transition-all font-medium ${
                statusFilter === f.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando agendamentos do banco...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <CalendarIcon size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum agendamento encontrado</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Assim que os tutores agendarem banho, tosa ou consulta pelo aplicativo, eles aparecerão organizados aqui.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="space-y-4">
          {filtered.map((app) => {
            const dateObj = new Date(app.date);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
            const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const status = statusConfig[app.status] || statusConfig.PENDING;

            return (
              <div key={app.id} className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4 hover:border-orange-200 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Date & Service */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 text-orange-700 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border border-orange-100">
                      <span className="text-[10px] uppercase">{formattedDate.split(' ')[0]}</span>
                      <span className="text-lg leading-none">{dateObj.getDate()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 text-base">{app.service.name}</span>
                        <Badge variant={status.badge}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-neutral-800">
                          <Clock size={12} className="text-orange-500" /> {formattedTime} ({app.service.duration} min)
                        </span>
                        <span>•</span>
                        <span className="font-bold text-green-700">R$ {app.service.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pet and Tutor */}
                  <div className="flex items-center gap-6 text-xs">
                    {/* Pet */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        {app.pet.photo ? (
                          <img src={app.pet.photo} alt={app.pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">🐾</div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{app.pet.name}</p>
                        <p className="text-[11px] text-neutral-400">{app.pet.species} {app.pet.breed ? `• ${app.pet.breed}` : ''}</p>
                      </div>
                    </div>

                    {/* Tutor */}
                    <div className="flex items-center gap-2.5 border-l border-neutral-100 pl-4">
                      <Avatar src={app.tutor.avatar || '/user.jpg'} name={app.tutor.name} size="sm" />
                      <div>
                        <p className="font-bold text-neutral-900">{app.tutor.name}</p>
                        <p className="text-[11px] text-neutral-400">{app.tutor.phone || app.tutor.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Employee & Actions */}
                  <div className="flex items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100 justify-between lg:justify-end">
                    {/* Assign Employee */}
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-neutral-400 shrink-0" />
                      <select
                        value={app.employee?.id || ''}
                        onChange={(e) => handleAssignEmployee(app.id, e.target.value)}
                        className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 font-medium cursor-pointer"
                      >
                        <option value="">Atribuir profissional...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Action */}
                    <div className="flex gap-1.5">
                      {app.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'CONFIRMED')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          Confirmar
                        </button>
                      )}
                      {app.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'IN_PROGRESS')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          Iniciar
                        </button>
                      )}
                      {app.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          Concluir
                        </button>
                      )}
                      {app.status !== 'COMPLETED' && app.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-700">Selecione o Dia:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-800"
              />
            </div>
            <span className="text-xs text-neutral-400">
              {appointments.filter(a => a.date.startsWith(selectedDate)).length} agendamentos neste dia
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {appointments.filter(a => a.date.startsWith(selectedDate)).length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <CalendarIcon size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-xs font-bold text-neutral-600">Nenhum atendimento agendado para esta data</p>
              </div>
            ) : (
              appointments
                .filter(a => a.date.startsWith(selectedDate))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((app) => (
                  <div key={app.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-orange-600 font-mono text-sm">
                        {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <p className="font-bold text-neutral-900">{app.service.name} • {app.pet.name} ({app.tutor.name})</p>
                        <p className="text-[11px] text-neutral-400">
                          {app.employee ? `Profissional: ${app.employee.name}` : 'Nenhum profissional atribuído'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusConfig[app.status]?.badge || 'warning'}>
                      {statusConfig[app.status]?.label || app.status}
                    </Badge>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
