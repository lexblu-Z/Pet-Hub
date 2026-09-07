import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Clock,
  MapPin,
  RefreshCw,
  PawPrint,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  htmlLink?: string;
  isPetHub?: boolean;
}

interface GoogleCalendarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pethubAppointments?: any[];
}

type ViewMode = 'month' | 'week' | 'day';

export const GoogleCalendarViewModal: React.FC<GoogleCalendarViewModalProps> = ({
  isOpen,
  onClose,
  pethubAppointments = [],
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const toast = useToast();

  const fetchGoogleEvents = async () => {
    setIsLoading(true);
    try {
      // Calculate date window around currentDate
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const res = await api.get('/google/events', {
        params: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
        },
      });

      setEvents(res.data?.events || []);
    } catch (err) {
      console.error('Failed to load Google events:', err);
      toast.error('Erro ao carregar eventos da agenda Google.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGoogleEvents();
    }
  }, [isOpen, currentDate.getMonth(), currentDate.getFullYear()]);

  if (!isOpen) return null;

  // Consolidate PetHub appointments + Google events (excluding duplicates)
  const consolidatedEvents: CalendarEvent[] = [
    // 1. PetHub Appointments formatted as CalendarEvents
    ...pethubAppointments.map((apt) => {
      const startIso = apt.date.includes('T') ? apt.date : `${apt.date}T${apt.time || '09:00'}:00`;
      return {
        id: `pethub-${apt.id}`,
        summary: `${apt.serviceName || 'Atendimento'} • ${apt.petName || 'Pet'}`,
        description: `Estabelecimento: ${apt.establishmentName || 'PetHub'} | Status: ${apt.status}`,
        start: startIso,
        end: startIso,
        isPetHub: true,
      };
    }),
    // 2. Google Calendar events that aren't duplicates
    ...events.filter((ev) => !ev.isPetHub),
  ];

  // Date Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format header title
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthTitle = `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;

  // Helper: check if two dates are the same day
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Helper: get events for a given Date
  const getEventsForDate = (date: Date) => {
    return consolidatedEvents.filter((ev) => {
      if (!ev.start) return false;
      const evDate = new Date(ev.start);
      return isSameDay(evDate, date);
    });
  };

  // Generate days for Month View
  const getDaysInMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  // Generate days for Week View
  const getDaysInWeek = () => {
    const days: Date[] = [];
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const today = new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#1E1F20] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-[#313335] overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-[#313335] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-[#1E1F20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] leading-tight">
                Agenda Completa Sincronizada
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#C4C7C5]">
                Seus compromissos do PetHub e eventos do Google Calendar em harmonia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchGoogleEvents}
              disabled={isLoading}
              title="Atualizar eventos"
              className="p-2 rounded-xl text-neutral-500 dark:text-[#C4C7C5] hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-200/80 dark:bg-[#282A2C] hover:bg-neutral-300 dark:hover:bg-[#313335] text-neutral-600 dark:text-[#C4C7C5] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar: Navigation & View Toggle */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-100 dark:border-[#313335] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1E1F20]">
          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-[#313335] hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-neutral-200 dark:border-[#313335] hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-[#313335] hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <span className="font-bold text-sm sm:text-base text-neutral-800 dark:text-[#E3E3E3] ml-2">
              {monthTitle}
            </span>
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#282A2C] p-1 rounded-xl border border-neutral-200/80 dark:border-[#313335]">
            <button
              onClick={() => { setViewMode('month'); setSelectedDayEvents(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-[#1E1F20] text-orange-600 dark:text-orange-400 shadow-xs border border-neutral-200/60 dark:border-[#313335]'
                  : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3]'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => { setViewMode('week'); setSelectedDayEvents(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-[#1E1F20] text-orange-600 dark:text-orange-400 shadow-xs border border-neutral-200/60 dark:border-[#313335]'
                  : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3]'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => { setViewMode('day'); setSelectedDayEvents(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-[#1E1F20] text-orange-600 dark:text-orange-400 shadow-xs border border-neutral-200/60 dark:border-[#313335]'
                  : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3]'
              }`}
            >
              Dia
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading && events.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Carregando eventos do Google Calendar...</p>
            </div>
          ) : (
            <>
              {/* MONTH VIEW */}
              {viewMode === 'month' && (
                <div className="space-y-3">
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-neutral-400 uppercase tracking-wider pb-1">
                    <span>Dom</span>
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {getDaysInMonthGrid().map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-neutral-50/50 dark:bg-[#131314]/30 border border-transparent" />;
                      }

                      const dayEvents = getEventsForDate(day);
                      const isCurrentDay = isSameDay(day, today);
                      const isSelected = selectedDayDate && isSameDay(day, selectedDayDate);

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => {
                            setSelectedDayDate(day);
                            setSelectedDayEvents(dayEvents);
                          }}
                          className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 ring-2 ring-orange-500/20'
                              : isCurrentDay
                              ? 'border-orange-300 dark:border-orange-600 bg-orange-50/20 dark:bg-orange-950/20'
                              : 'border-neutral-200/80 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-neutral-300 dark:hover:border-[#444746] hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                                isCurrentDay
                                  ? 'bg-orange-500 text-white'
                                  : 'text-neutral-700 dark:text-[#E3E3E3]'
                              }`}
                            >
                              {day.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] font-bold px-1 rounded-md bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event badges preview */}
                          <div className="space-y-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <div
                                key={ev.id}
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${
                                  ev.isPetHub
                                    ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300'
                                    : 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                                }`}
                              >
                                {ev.isPetHub ? (
                                  <PawPrint size={10} className="shrink-0 text-orange-600" />
                                ) : (
                                  <CalendarIcon size={10} className="shrink-0 text-blue-600" />
                                )}
                                <span className="truncate">{ev.summary}</span>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <p className="text-[9px] text-neutral-400 dark:text-[#8E918F] font-semibold pl-1">
                                +{dayEvents.length - 2} mais
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Day Event Drawer */}
                  {selectedDayDate && selectedDayEvents && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 sm:p-5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-200/80 dark:border-[#313335] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-[#313335] pb-2">
                        <h4 className="font-bold text-sm text-neutral-800 dark:text-[#E3E3E3]">
                          Compromissos para {selectedDayDate.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                        </h4>
                        <button
                          onClick={() => { setSelectedDayDate(null); setSelectedDayEvents(null); }}
                          className="text-xs text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3]"
                        >
                          Fechar
                        </button>
                      </div>

                      {selectedDayEvents.length === 0 ? (
                        <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] py-2">Nenhum evento registrado nesta data.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {selectedDayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                                ev.isPetHub
                                  ? 'bg-orange-50/60 dark:bg-[#1E1F20] border-orange-200 dark:border-orange-800/60'
                                  : 'bg-white dark:bg-[#1E1F20] border-neutral-200 dark:border-[#313335]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {ev.isPetHub ? (
                                    <PawPrint size={14} className="text-orange-500 shrink-0" />
                                  ) : (
                                    <CalendarIcon size={14} className="text-blue-500 shrink-0" />
                                  )}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    ev.isPetHub ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                                  }`}>
                                    {ev.isPetHub ? 'PetHub' : 'Google Calendar'}
                                  </span>
                                  {ev.start && (
                                    <span className="text-xs font-mono font-bold text-neutral-600 dark:text-[#C4C7C5] ml-1">
                                      {new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-xs text-neutral-900 dark:text-[#E3E3E3]">{ev.summary}</p>
                                {ev.description && (
                                  <p className="text-[11px] text-neutral-500 dark:text-[#C4C7C5] line-clamp-2">{ev.description}</p>
                                )}
                              </div>
                              {ev.htmlLink && (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-neutral-400 dark:text-[#8E918F] hover:text-blue-600 dark:hover:text-blue-400 p-1"
                                  title="Ver no Google Calendar"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* WEEK VIEW */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                  {getDaysInWeek().map((day) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentDay = isSameDay(day, today);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-3 rounded-2xl border flex flex-col gap-2 min-h-[320px] ${
                          isCurrentDay
                            ? 'bg-orange-50/20 dark:bg-orange-950/20 border-orange-300 dark:border-orange-600'
                            : 'bg-neutral-50/40 dark:bg-[#1E1F20] border-neutral-200 dark:border-[#313335]'
                        }`}
                      >
                        <div className="text-center pb-2 border-b border-neutral-200/60 dark:border-[#313335]">
                          <p className="text-[11px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase">
                            {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </p>
                          <p
                            className={`text-sm font-bold w-6 h-6 mx-auto rounded-full flex items-center justify-center mt-1 ${
                              isCurrentDay ? 'bg-orange-500 text-white' : 'text-neutral-800 dark:text-[#E3E3E3]'
                            }`}
                          >
                            {day.getDate()}
                          </p>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto">
                          {dayEvents.length === 0 ? (
                            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] text-center py-4">Sem eventos</p>
                          ) : (
                            dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className={`p-2 rounded-xl text-xs border shadow-2xs space-y-1 ${
                                  ev.isPetHub
                                    ? 'bg-white dark:bg-[#282A2C] border-orange-200 dark:border-orange-800/60 text-orange-950 dark:text-orange-200'
                                    : 'bg-white dark:bg-[#282A2C] border-blue-200 dark:border-blue-800/60 text-blue-950 dark:text-blue-200'
                                }`}
                              >
                                <div className="flex items-center gap-1 font-bold text-[10px]">
                                  {ev.isPetHub ? (
                                    <PawPrint size={11} className="text-orange-500 shrink-0" />
                                  ) : (
                                    <CalendarIcon size={11} className="text-blue-500 shrink-0" />
                                  )}
                                  <span>
                                    {ev.start ? new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="font-semibold text-[11px] leading-tight line-clamp-2">
                                  {ev.summary}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DAY VIEW */}
              {viewMode === 'day' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Visão Diária</p>
                      <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3]">
                        {currentDate.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] bg-white dark:bg-[#282A2C] px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-[#313335] shadow-2xs">
                      {getEventsForDate(currentDate).length} evento(s)
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {getEventsForDate(currentDate).length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335]">
                        <CalendarIcon size={36} className="mx-auto text-neutral-300 dark:text-[#313335] mb-2" />
                        <p className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5]">Nenhum evento marcado para este dia</p>
                        <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">Aproveite para descansar ou agendar um cuidado para o seu pet!</p>
                      </div>
                    ) : (
                      getEventsForDate(currentDate).map((ev) => (
                        <div
                          key={ev.id}
                          className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                            ev.isPetHub
                              ? 'bg-orange-50/50 dark:bg-[#282A2C] border-orange-200 dark:border-orange-800/60'
                              : 'bg-white dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335] hover:border-neutral-300 dark:hover:border-[#444746]'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {ev.isPetHub ? (
                                <PawPrint size={16} className="text-orange-500 shrink-0" />
                              ) : (
                                <CalendarIcon size={16} className="text-blue-500 shrink-0" />
                              )}
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  ev.isPetHub ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                                }`}
                              >
                                {ev.isPetHub ? 'Agendamento PetHub' : 'Google Calendar'}
                              </span>
                              {ev.start && (
                                <div className="flex items-center gap-1 text-xs font-mono font-bold text-neutral-600 dark:text-[#C4C7C5]">
                                  <Clock size={12} />
                                  <span>
                                    {new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">{ev.summary}</h4>
                            {ev.description && (
                              <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] leading-relaxed">{ev.description}</p>
                            )}
                            {ev.location && (
                              <p className="text-xs text-neutral-400 dark:text-[#8E918F] flex items-center gap-1">
                                <MapPin size={12} /> {ev.location}
                              </p>
                            )}
                          </div>

                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-400 dark:text-[#8E918F] hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#313335] transition-colors"
                              title="Abrir no Google Calendar"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Legend */}
        <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-[#1E1F20] border-t border-neutral-200/80 dark:border-[#313335] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-[#C4C7C5]">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Agendamentos PetHub (Principal)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-[#C4C7C5]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Google Calendar
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
            A fonte da verdade oficial para atendimentos veterinários e de pet shop é o <strong>PetHub</strong>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
