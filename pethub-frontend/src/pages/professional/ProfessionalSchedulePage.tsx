import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Search, 
  User, 
  PawPrint, 
  Stethoscope, 
  AlertCircle, 
  RefreshCw, 
  Building2, 
  Phone, 
  Mail, 
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarCheck2,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Calendar,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Badge, Input, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';
import { 
  getBrasiliaToday, 
  formatBrasiliaDate, 
  formatBrasiliaDateFull,
  formatBrasiliaWeekday, 
  getDayKeyFromDate,
  addDaysToDate,
  getWeekDays,
  type WeekDayInfo
} from '@/utils/date';

interface Appointment {
  id: string;
  time: string;        // HH:MM (ex: "13:00")
  date: string;        // YYYY-MM-DD
  dateISO: string;
  petId: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petPhoto: string | null;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  tutorPhone: string | null;
  tutorPhoto: string | null;
  serviceId: string;
  service: string;
  serviceCategory: string | null;
  price: number;
  duration: number;
  establishmentId: string;
  establishmentName: string | null;
  professionalId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface DayWorkingHours {
  enabled?: boolean;
  isOpen?: boolean;
  open: string;
  close: string;
  hasBreak?: boolean;
  breakStart?: string;
  breakEnd?: string;
}

type WorkingHoursMap = Record<string, DayWorkingHours>;

const statusConfig: Record<string, { label: string; badge: 'warning' | 'info' | 'brand' | 'success' | 'error' }> = {
  PENDING:     { label: 'Agendado',     badge: 'warning' },
  CONFIRMED:   { label: 'Confirmado',   badge: 'info' },
  IN_PROGRESS: { label: 'Em Andamento', badge: 'brand' },
  COMPLETED:   { label: 'Concluído',    badge: 'success' },
  CANCELLED:   { label: 'Cancelado',    badge: 'error' },
};

function getFullImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
}

export default function ProfessionalSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => getBrasiliaToday());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekAppointmentsMap, setWeekAppointmentsMap] = useState<Record<string, number>>({});
  const [workingHours, setWorkingHours] = useState<WorkingHoursMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showGoogleCard, setShowGoogleCard] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const todayBrasilia = useMemo(() => getBrasiliaToday(), []);
  const isToday = selectedDate === todayBrasilia;

  // Calcula os 7 dias da semana (Segunda a Domingo) em torno de selectedDate
  const currentWeekDays = useMemo(() => {
    return getWeekDays(selectedDate, selectedDate);
  }, [selectedDate]);

  // 1. Carregar disponibilidade real configurada em /profissional/prestar-servicos
  const fetchAvailability = async () => {
    try {
      const res = await api.get('/professional/availability');
      if (res.data?.workingHours) {
        setWorkingHours(res.data.workingHours);
      }
    } catch (err) {
      console.warn('Não foi possível carregar disponibilidade do profissional:', err);
    }
  };

  // 2. Carregar agendamentos do dia selecionado
  const fetchDayAppointments = async (dateToFetch: string, currentFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { date: dateToFetch };
      if (currentFilter !== 'ALL') params.status = currentFilter;

      const res = await api.get('/professional/appointments', { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setAppointments(data);
    } catch (err: any) {
      console.error('[AGENDA PROFISSIONAL] Erro ao buscar agendamentos do dia:', err);
      setError('Não foi possível carregar os agendamentos desta data.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // 3. Carregar resumo de agendamentos reais da semana inteira para os indicadores visuais
  const fetchWeekSummary = async (startIso: string, endIso: string) => {
    try {
      const res = await api.get('/professional/appointments', {
        params: { startDate: startIso, endDate: endIso }
      });
      if (Array.isArray(res.data)) {
        const counts: Record<string, number> = {};
        for (const apt of res.data) {
          if (apt.date) {
            counts[apt.date] = (counts[apt.date] || 0) + 1;
          }
        }
        setWeekAppointmentsMap(counts);
      }
    } catch (err) {
      console.warn('Erro ao buscar indicadores da semana:', err);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  useEffect(() => {
    fetchDayAppointments(selectedDate, statusFilter);
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    if (currentWeekDays.length === 7) {
      fetchWeekSummary(currentWeekDays[0].iso, currentWeekDays[6].iso);
    }
  }, [currentWeekDays]);

  // Navegações de data
  const handlePrevDay = () => {
    setSelectedDate(prev => addDaysToDate(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDaysToDate(prev, 1));
  };

  const handleGoToday = () => {
    setSelectedDate(todayBrasilia);
  };

  const handlePrevWeek = () => {
    setSelectedDate(prev => addDaysToDate(prev, -7));
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => addDaysToDate(prev, 7));
  };

  const handleSelectDay = (dayIso: string) => {
    setSelectedDate(dayIso);
  };

  // Atualizar status do agendamento
  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      await api.put(`/professional/appointments/${id}/status`, { status: newStatus });
      toast.success('Status do atendimento atualizado!');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (selectedApt?.id === id) {
        setSelectedApt(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao atualizar status do atendimento.';
      toast.error(msg);
    }
  };

  // Filtro de busca textual
  const filtered = appointments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      (a.petName || '').toLowerCase().includes(q) ||
      (a.tutorName || '').toLowerCase().includes(q) ||
      (a.service || '').toLowerCase().includes(q) ||
      (a.establishmentName || '').toLowerCase().includes(q)
    );
  });

  // Dados do dia selecionado
  const currentDayKey = getDayKeyFromDate(selectedDate);
  const currentWeekdayName = formatBrasiliaWeekday(selectedDate);
  const formattedFullDate = formatBrasiliaDateFull(selectedDate);
  const daySchedule = workingHours ? (workingHours[currentDayKey] || workingHours[currentDayKey.toLowerCase()]) : null;
  const isDayEnabled = daySchedule?.enabled !== undefined ? Boolean(daySchedule.enabled) : Boolean(daySchedule?.isOpen ?? true);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header com Navegação Temporal Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Minha Agenda</h1>
            {isToday ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                Hoje
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-[#282A2C] dark:text-[#C4C7C5]">
                {formatBrasiliaDate(selectedDate)}
              </span>
            )}
          </div>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5 capitalize">
            {formattedFullDate}
          </p>
        </div>

        {/* Controles de Ação e Navegação Rápida */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Botão Hoje */}
          <button
            onClick={handleGoToday}
            disabled={isToday}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isToday
                ? 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 border border-orange-200/80 dark:border-orange-900/40 shadow-xs'
            }`}
          >
            Ir para Hoje
          </button>

          {/* Navegação Dia Anterior / Próximo Dia */}
          <div className="flex items-center bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl p-0.5 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-lg text-neutral-700 dark:text-[#C4C7C5] transition-colors cursor-pointer"
              title="Dia anterior (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-semibold text-neutral-500 dark:text-[#8E918F] hidden sm:inline">
              Dia
            </span>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-lg text-neutral-700 dark:text-[#C4C7C5] transition-colors cursor-pointer"
              title="Próximo dia (→)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Date Picker Direto */}
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer w-full h-full"
              title="Escolher data no calendário"
            />
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="px-3 py-2 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs font-bold text-neutral-800 dark:text-[#E3E3E3] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CalendarDays size={15} className="text-orange-500" />
              <span>Calendário</span>
            </button>
          </div>

          {/* Botão Google Calendar */}
          <Button
            size="xs"
            variant={showGoogleCard ? 'primary' : 'outline'}
            onClick={() => setShowGoogleCard(!showGoogleCard)}
            className="flex items-center gap-1.5 text-xs font-bold"
            leftIcon={<Calendar size={13} />}
          >
            Google Calendar
          </Button>

          {/* Recarregar */}
          <button
            onClick={() => fetchDayAppointments(selectedDate, statusFilter)}
            className="p-2 rounded-xl border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
            title="Recarregar atendimentos"
          >
            <RefreshCw size={15} className={`text-neutral-500 dark:text-[#8E918F] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showGoogleCard && (
        <GoogleCalendarCard
          returnTo="/profissional/agenda"
          roleTitle="suas consultas e procedimentos veterinários"
        />
      )}

      {/* STRIP DE CALENDÁRIO SEMANAL COM DADOS REAIS */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-[#313335]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider">
              Navegação Semanal
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
              ({formatBrasiliaDate(currentWeekDays[0]?.iso)} a {formatBrasiliaDate(currentWeekDays[6]?.iso)})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-lg text-neutral-600 dark:text-[#C4C7C5] transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Semana anterior"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline font-medium">Semana anterior</span>
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-lg text-neutral-600 dark:text-[#C4C7C5] transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Próxima semana"
            >
              <span className="hidden sm:inline font-medium">Próxima semana</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Grade com os 7 Dias da Semana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {currentWeekDays.map((day) => {
            const hasApts = Boolean(weekAppointmentsMap[day.iso] && weekAppointmentsMap[day.iso] > 0);
            const aptCount = weekAppointmentsMap[day.iso] || 0;

            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => handleSelectDay(day.iso)}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer relative ${
                  day.isSelected
                    ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-500/30 scale-[1.02]'
                    : day.isToday
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-700 text-neutral-900 dark:text-[#E3E3E3] hover:border-orange-400'
                    : 'bg-neutral-50/70 dark:bg-[#282A2C] border border-neutral-200/60 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:bg-neutral-100 dark:hover:bg-[#313335]'
                }`}
              >
                {/* Nome do dia abreviado */}
                <span className={`text-[10px] sm:text-xs uppercase font-bold tracking-tight ${
                  day.isSelected ? 'text-white/90' : 'text-neutral-400 dark:text-[#8E918F]'
                }`}>
                  {day.dayNameShort}
                </span>

                {/* Número do dia */}
                <span className={`text-sm sm:text-lg font-black mt-0.5 ${
                  day.isSelected ? 'text-white' : 'text-neutral-900 dark:text-[#E3E3E3]'
                }`}>
                  {day.dayNumber}
                </span>

                {/* Indicador de "Hoje" */}
                {day.isToday && !day.isSelected && (
                  <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tighter">
                    Hoje
                  </span>
                )}

                {/* Indicador de Agendamentos Reais naquele Dia */}
                {hasApts && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      day.isSelected ? 'bg-white' : 'bg-orange-500'
                    }`} />
                    <span className={`text-[9px] font-bold ${
                      day.isSelected ? 'text-white' : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {aptCount}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* BLOCO 2: Horário de Trabalho / Disponibilidade Real da Data Selecionada */}
      <div className="bg-gradient-to-r from-orange-50/70 via-white to-orange-50/40 dark:from-[#282A2C] dark:via-[#1E1F20] dark:to-[#282A2C] rounded-2xl border border-orange-200/70 dark:border-[#313335] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-950 dark:text-orange-300">
                  Horário de Trabalho do Dia
                </span>
                <span className="text-xs text-neutral-400 dark:text-[#8E918F]">•</span>
                <span className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3] capitalize">
                  {currentWeekdayName} ({formatBrasiliaDate(selectedDate)})
                </span>
              </div>

              <div className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] mt-0.5 flex items-center gap-2 flex-wrap">
                {isDayEnabled && daySchedule ? (
                  <>
                    <span>Expediente: {daySchedule.open} — {daySchedule.close}</span>
                    {daySchedule.hasBreak && daySchedule.breakStart && daySchedule.breakEnd && (
                      <span className="text-xs font-normal text-neutral-600 dark:text-[#8E918F] bg-white dark:bg-[#1E1F20] px-2 py-0.5 rounded-md border border-neutral-200 dark:border-[#313335]">
                        Intervalo: {daySchedule.breakStart} às {daySchedule.breakEnd}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-500 dark:text-[#8E918F] font-medium">
                    Sem expediente neste dia (folga configurada)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-[#E3E3E3] px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] transition-colors cursor-pointer"
            >
              {showFullSchedule ? 'Ocultar semana' : 'Ver todos os dias'}
            </button>
            <Link
              to="/profissional/prestar-servicos"
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 px-3 py-1.5 rounded-lg bg-orange-100/60 dark:bg-orange-950/40 hover:bg-orange-100 transition-colors flex items-center gap-1"
            >
              <SlidersHorizontal size={13} />
              Configurar horários
            </Link>
          </div>
        </div>

        {/* Resumo da Semana Completa (Colapsável) */}
        {showFullSchedule && workingHours && (
          <div className="mt-4 pt-4 border-t border-orange-200/40 dark:border-[#313335] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { key: 'segunda', label: 'Segunda' },
              { key: 'terca',   label: 'Terça' },
              { key: 'quarta',  label: 'Quarta' },
              { key: 'quinta',  label: 'Quinta' },
              { key: 'sexta',   label: 'Sexta' },
              { key: 'sabado',  label: 'Sábado' },
              { key: 'domingo', label: 'Domingo' },
            ].map(d => {
              const cfg = workingHours[d.key];
              const active = cfg?.enabled !== undefined ? Boolean(cfg.enabled) : Boolean(cfg?.isOpen);
              const isSelected = d.key === currentDayKey;
              return (
                <div
                  key={d.key}
                  className={`p-2.5 rounded-xl text-center text-xs border transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 font-bold text-orange-900 dark:text-orange-200'
                      : 'border-neutral-200/60 dark:border-[#313335] bg-white/80 dark:bg-[#1E1F20] text-neutral-600 dark:text-[#C4C7C5]'
                  }`}
                >
                  <span className="block text-[11px] uppercase font-bold text-neutral-400 dark:text-[#8E918F]">{d.label}</span>
                  {active && cfg ? (
                    <span className="block mt-0.5 font-semibold text-[11px]">{cfg.open} - {cfg.close}</span>
                  ) : (
                    <span className="block mt-0.5 text-[11px] text-neutral-400 dark:text-[#8E918F]">Folga</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 3: Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por paciente, tutor, serviço..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL',         label: 'Todos' },
            { id: 'PENDING',     label: 'Agendados' },
            { id: 'CONFIRMED',   label: 'Confirmados' },
            { id: 'IN_PROGRESS', label: 'Em Andamento' },
            { id: 'COMPLETED',   label: 'Concluídos' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all font-medium cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 dark:bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-200 dark:hover:bg-[#313335]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BLOCO 4: Lista de Agendamentos Reais do Dia Selecionado */}
      <div className="space-y-4">
        {/* Cabeçalho da Lista com Data e Contagem */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base">
              Atendimentos para {formatBrasiliaDate(selectedDate)}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] rounded-full">
              {filtered.length} agendamento{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335]">
            <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-[#C4C7C5]">Carregando agendamentos...</p>
            <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-1">Buscando atendimentos do dia {formatBrasiliaDate(selectedDate)}</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-red-200 dark:border-red-900/40">
            <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
            <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">Não foi possível carregar os agendamentos</h3>
            <p className="text-xs text-red-500 dark:text-red-400 mb-4">{error}</p>
            <Button size="xs" onClick={() => fetchDayAppointments(selectedDate, statusFilter)}>Tentar novamente</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335] space-y-3">
            <CalendarIcon size={40} className="mx-auto text-neutral-300 dark:text-neutral-600" />
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base">
                {search 
                  ? 'Nenhum agendamento encontrado para esta busca' 
                  : `Você ainda não possui agendamentos para ${formatBrasiliaDate(selectedDate)}`}
              </h3>
              <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-md mx-auto">
                {search
                  ? 'Verifique a digitação ou remova os filtros de busca.'
                  : 'Navegue pelos outros dias da semana ou consulte agendamentos futuros usando os controles acima.'}
              </p>
            </div>

            {/* Ações Rápidas no Estado Vazio */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleNextDay}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100 dark:hover:bg-[#313335] text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Ver dia seguinte</span>
                <ChevronRight size={14} />
              </button>
              {!isToday && (
                <button
                  onClick={handleGoToday}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Voltar para Hoje
                </button>
              )}
            </div>
          </div>
        ) : (
          filtered.map(apt => {
            const status = statusConfig[apt.status] || statusConfig.PENDING;
            const priceFormatted = Number(apt.price ?? 0).toFixed(2).replace('.', ',');

            return (
              <div
                key={apt.id}
                className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] shadow-xs overflow-hidden hover:border-orange-300 dark:hover:border-orange-500/40 transition-all"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Horário + Serviço */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Horário em Destaque */}
                      <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border border-orange-100 dark:border-orange-900/40">
                        <Clock size={15} />
                        <span className="text-base font-black mt-0.5 tracking-tight">{apt.time}</span>
                      </div>

                      {/* Informações do Serviço */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-neutral-900 dark:text-[#E3E3E3] text-base">
                            {apt.service}
                          </span>
                          <Badge variant={status.badge}>{status.label}</Badge>
                          {apt.establishmentName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-[#8E918F] bg-neutral-100 dark:bg-[#282A2C] px-2 py-0.5 rounded-md">
                              <Building2 size={11} />
                              {apt.establishmentName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-[#8E918F] mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-[#E3E3E3]">
                            <Clock size={12} className="text-orange-500" /> {apt.duration} min
                          </span>
                          <span>•</span>
                          <span className="font-bold text-green-700 dark:text-emerald-400">
                            R$ {priceFormatted}
                          </span>
                          {apt.serviceCategory && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{apt.serviceCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paciente (Pet) e Tutor (Quem agendou) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs lg:justify-end">
                      {/* Paciente */}
                      <div className="flex items-center gap-3 bg-neutral-50/80 dark:bg-[#282A2C]/60 p-2.5 rounded-xl border border-neutral-100 dark:border-[#313335]">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-[#1E1F20] overflow-hidden shrink-0 border border-neutral-200 dark:border-[#313335] flex items-center justify-center">
                          {apt.petPhoto ? (
                            <img src={getFullImageUrl(apt.petPhoto)} alt={apt.petName} className="w-full h-full object-cover" />
                          ) : (
                            <PawPrint size={18} className="text-neutral-400 dark:text-[#8E918F]" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.petName}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                            {apt.petSpecies}{apt.petBreed ? ` • ${apt.petBreed}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Tutor */}
                      <div className="flex items-center gap-3 bg-neutral-50/80 dark:bg-[#282A2C]/60 p-2.5 rounded-xl border border-neutral-100 dark:border-[#313335]">
                        <Avatar
                          src={getFullImageUrl(apt.tutorPhoto)}
                          name={apt.tutorName}
                          size="sm"
                          fallbackSrc="/user.jpg"
                        />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.tutorName}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                            {apt.tutorPhone || apt.tutorEmail || 'Tutor'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Profissional */}
                  <div className="flex items-center gap-2 justify-end border-t border-neutral-100 dark:border-[#313335] pt-3 mt-4">
                    <button
                      onClick={() => setSelectedApt(apt)}
                      className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                    >
                      Ver detalhes →
                    </button>

                    {apt.status === 'PENDING' && (
                      <Button size="xs" variant="outline" onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}>
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
                        <CheckCircle size={13} className="mr-1" /> Concluir Atendimento
                      </Button>
                    )}
                    {apt.status === 'COMPLETED' && (
                      <span className="text-xs font-semibold text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-green-200 dark:border-emerald-800/50 inline-flex items-center gap-1">
                        <CheckCircle size={12} /> Atendimento Concluído
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Detalhes Completos do Agendamento */}
      {selectedApt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setSelectedApt(null)}
        >
          <div className="bg-white dark:bg-[#1E1F20] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-[#313335] animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-lg">Ficha do Agendamento</h3>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-0.5">ID: {selectedApt.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedApt(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-500 dark:text-[#8E918F] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Cartões Data / Horário / Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50/80 dark:bg-orange-950/30 rounded-2xl p-3 text-center border border-orange-100 dark:border-orange-900/40">
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Data</p>
                  <p className="font-black text-neutral-900 dark:text-[#E3E3E3] text-sm">{formatBrasiliaDate(selectedApt.date)}</p>
                </div>
                <div className="bg-orange-50/80 dark:bg-orange-950/30 rounded-2xl p-3 text-center border border-orange-100 dark:border-orange-900/40">
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Horário</p>
                  <p className="font-black text-neutral-900 dark:text-[#E3E3E3] text-sm">{selectedApt.time}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-[#282A2C] rounded-2xl p-3 text-center border border-neutral-100 dark:border-[#313335]">
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider mb-1">Status</p>
                  <Badge variant={statusConfig[selectedApt.status]?.badge || 'warning'} className="text-xs">
                    {statusConfig[selectedApt.status]?.label || selectedApt.status}
                  </Badge>
                </div>
              </div>

              {/* Paciente (Pet) */}
              <div className="bg-neutral-50/70 dark:bg-[#282A2C]/50 rounded-2xl p-4 border border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2 mb-3">
                  <PawPrint size={16} className="text-orange-500" />
                  <span className="text-xs font-bold text-neutral-500 dark:text-[#8E918F] uppercase tracking-wider">Paciente</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#1E1F20] overflow-hidden border border-neutral-200 dark:border-[#313335] flex items-center justify-center shrink-0">
                    {selectedApt.petPhoto ? (
                      <img src={getFullImageUrl(selectedApt.petPhoto)} alt={selectedApt.petName} className="w-full h-full object-cover" />
                    ) : (
                      <PawPrint size={24} className="text-neutral-300 dark:text-neutral-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">{selectedApt.petName}</p>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                      Espécie: <span className="font-semibold text-neutral-800 dark:text-[#C4C7C5]">{selectedApt.petSpecies}</span>
                    </p>
                    {selectedApt.petBreed && (
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                        Raça: <span className="font-semibold text-neutral-800 dark:text-[#C4C7C5]">{selectedApt.petBreed}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tutor (Quem Agendou) */}
              <div className="bg-neutral-50/70 dark:bg-[#282A2C]/50 rounded-2xl p-4 border border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-orange-500" />
                  <span className="text-xs font-bold text-neutral-500 dark:text-[#8E918F] uppercase tracking-wider">Tutor Responsável</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={getFullImageUrl(selectedApt.tutorPhoto)}
                    name={selectedApt.tutorName}
                    size="md"
                    fallbackSrc="/user.jpg"
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">{selectedApt.tutorName}</p>
                    {selectedApt.tutorPhone && (
                      <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] flex items-center gap-1.5">
                        <Phone size={12} className="text-orange-500" /> {selectedApt.tutorPhone}
                      </p>
                    )}
                    {selectedApt.tutorEmail && (
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F] flex items-center gap-1.5">
                        <Mail size={12} className="text-orange-500" /> {selectedApt.tutorEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Serviço Agendado */}
              <div className="bg-neutral-50/70 dark:bg-[#282A2C]/50 rounded-2xl p-4 border border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope size={16} className="text-orange-500" />
                  <span className="text-xs font-bold text-neutral-500 dark:text-[#8E918F] uppercase tracking-wider">Serviço</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{selectedApt.service}</p>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">Duração estimada: {selectedApt.duration} minutos</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-green-700 dark:text-emerald-400">
                      R$ {Number(selectedApt.price ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
                {selectedApt.establishmentName && (
                  <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-[#313335] flex items-center gap-2 text-xs text-neutral-500 dark:text-[#8E918F]">
                    <Building2 size={13} className="text-orange-500" />
                    <span>Local: <strong>{selectedApt.establishmentName}</strong></span>
                  </div>
                )}
              </div>

              {/* Ações Rápidas de Mudança de Status */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                {selectedApt.status === 'PENDING' && (
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => handleStatusChange(selectedApt.id, 'CONFIRMED')}
                  >
                    Confirmar Agendamento
                  </Button>
                )}
                {selectedApt.status === 'CONFIRMED' && (
                  <Button
                    fullWidth
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => handleStatusChange(selectedApt.id, 'IN_PROGRESS')}
                  >
                    Iniciar Atendimento Agora
                  </Button>
                )}
                {selectedApt.status === 'IN_PROGRESS' && (
                  <Button
                    fullWidth
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusChange(selectedApt.id, 'COMPLETED')}
                  >
                    <CheckCircle size={14} className="mr-1.5" /> Concluir Atendimento
                  </Button>
                )}
                <button
                  onClick={() => setSelectedApt(null)}
                  className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-[#313335] text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
