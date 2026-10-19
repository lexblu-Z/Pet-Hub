import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  PawPrint,
  Building2,
  Stethoscope,
  FileDown,
  Download,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/services/api';
import { Avatar } from '@/components/ui/Card';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { getBrasiliaToday, formatBrasiliaDate, formatAppointmentTime } from '@/utils/date';

export default function AdminUniversalAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(() => getBrasiliaToday());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchCode, setSearchCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState<any>({ ALL: 0, PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 });
  const [detailModalItem, setDetailModalItem] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const targetAptId = React.useMemo(() => {
    return searchParams.get('appointmentId') || (location.state as any)?.appointmentId || null;
  }, [searchParams, location.state]);
  const handledAptIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!targetAptId || handledAptIdRef.current === targetAptId) return;
    handledAptIdRef.current = targetAptId;

    api.get(`/admin/appointments/search?code=${encodeURIComponent(targetAptId)}`)
      .then((res) => {
        if (res.data) {
          setDetailModalItem(res.data);
          if (res.data.dateStr) {
            setSelectedDate(res.data.dateStr);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load target appointment for admin', err);
      });
  }, [targetAptId]);

  const handleCloseDetailModal = () => {
    setDetailModalItem(null);
    if (searchParams.has('appointmentId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('appointmentId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/appointments/universal?date=${selectedDate}`);
      setAppointments(res.data.appointments || []);
      setCounts(res.data.counts || { ALL: 0, PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 });
    } catch (err) {
      console.error('Failed to load universal appointments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    try {
      setIsLoading(true);
      const res = await api.get(`/admin/appointments/search?code=${encodeURIComponent(searchCode.trim())}`);
      setDetailModalItem(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Agendamento não encontrado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const res = await api.get(`/admin/export?type=appointments&format=${format}&startDate=${selectedDate}T00:00:00Z&endDate=${selectedDate}T23:59:59Z`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pethub_agendamentos_${selectedDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (statusFilter === 'ALL') return true;
    return app.status === statusFilter;
  });

  const formattedDateTitle = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon size={24} className="text-orange-500" />
            <span>Agenda Universal da Plataforma</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Monitoramento operacional de todos os agendamentos do ecossistema
          </p>
        </div>

        {/* Exports */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown size={15} />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-white dark:bg-[#1E1F20] hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Bar & Code Search */}
      <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Dia anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-[#131314] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-[#313335] transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Dia seguinte"
          >
            <ChevronRight size={18} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white cursor-pointer"
          />

          <span className="text-xs font-semibold capitalize text-neutral-700 dark:text-neutral-300 hidden lg:inline-block ml-2">
            {formattedDateTitle}
          </span>
        </div>

        {/* Code Search */}
        <form onSubmit={handleSearchCode} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Pesquisar código (#AGD-...)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === st
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#1E1F20] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            {st === 'ALL'
              ? `Todos (${counts.ALL || 0})`
              : st === 'CONFIRMED'
              ? `Confirmados (${counts.CONFIRMED || 0})`
              : st === 'PENDING'
              ? `Pendentes (${counts.PENDING || 0})`
              : st === 'COMPLETED'
              ? `Concluídos (${counts.COMPLETED || 0})`
              : `Cancelados (${counts.CANCELLED || 0})`}
          </button>
        ))}
      </div>

      {/* Universal Schedule Timeline List */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400">Carregando agenda operacional...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarIcon size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Nenhum agendamento encontrado
            </p>
            <p className="text-xs text-neutral-400">
              Não existem registros para {formatBrasiliaDate(selectedDate)} com o status selecionado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-[#313335]">
            {filteredAppointments.map((app) => (
              <div
                key={app.id}
                className="p-5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Time Badge */}
                  <div className="w-16 h-14 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex flex-col items-center justify-center font-bold shrink-0 border border-orange-500/20">
                    <span className="text-sm leading-tight">
                      {formatAppointmentTime(app)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {app.service?.duration ? `${app.service.duration}m` : '30m'}
                    </span>
                  </div>

                  {/* Service & Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900 dark:text-white">
                        {app.service?.name || 'Serviço'}
                      </span>
                      <span className="text-xs font-semibold text-neutral-400">
                        {app.code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                        <User size={13} /> {app.tutor.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <SpeciesIcon speciesId={app.pet?.species} className="w-3.5 h-3.5" />
                        <span>{app.pet.name} ({app.pet.species})</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={13} /> {app.establishment?.name || 'Estabelecimento'}
                      </span>
                      {app.professional && (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope size={13} /> {app.professional.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Price & Action */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-[#313335]">
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block mb-1 ${
                        app.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : app.status === 'CONFIRMED'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : app.status === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {app.status}
                    </span>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.service?.price || 0)}
                    </p>
                  </div>

                  <button
                    onClick={() => setDetailModalItem(app)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                    title="Detalhes operacionais"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Modal for Appointment Support */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-neutral-200 dark:border-[#313335] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#313335]">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Agendamento {detailModalItem.code}
                </h3>
                <p className="text-xs text-neutral-400">Identificador único da plataforma</p>
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                <div>
                  <span className="text-[10px] uppercase text-neutral-400">Status Operacional</span>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{detailModalItem.status}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-neutral-400">Valor do Serviço</span>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detailModalItem.service?.price || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Data / Horário</span>
                  <span className="font-semibold text-neutral-900 dark:text-white text-xs">
                    {formatBrasiliaDate(detailModalItem.dateStr || detailModalItem.date)} às {formatAppointmentTime(detailModalItem)}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Duração Estimada</span>
                  <span className="font-semibold text-neutral-900 dark:text-white text-xs">
                    {detailModalItem.service?.duration || 30} minutos
                  </span>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-3">
                <p className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                  Participantes do Atendimento
                </p>

                {/* Tutor */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-neutral-200/60 dark:border-[#313335]">
                  <Avatar
                    src={detailModalItem.tutor?.avatar}
                    fallbackSrc={detailModalItem.tutor?.defaultAvatar}
                    name={detailModalItem.tutor?.name || 'Tutor'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 dark:text-white truncate">
                        {detailModalItem.tutor?.name || 'Tutor'}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">Tutor</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {detailModalItem.tutor?.email || detailModalItem.tutor?.phone || 'Sem contato'}
                    </p>
                  </div>
                </div>

                {/* Pet */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-neutral-200/60 dark:border-[#313335]">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                    <SpeciesIcon speciesId={detailModalItem.pet?.species} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 dark:text-white truncate">
                        {detailModalItem.pet?.name || 'Pet'}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">Animal</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {detailModalItem.pet?.species || 'Espécie não informada'} {detailModalItem.pet?.breed ? `• ${detailModalItem.pet.breed}` : ''}
                    </p>
                  </div>
                </div>

                {/* Estabelecimento */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-neutral-200/60 dark:border-[#313335]">
                  <Avatar
                    src={detailModalItem.establishment?.avatar || detailModalItem.establishment?.establishmentProfile?.photos?.[0]}
                    fallbackSrc={detailModalItem.establishment?.defaultAvatar}
                    name={detailModalItem.establishment?.name || 'Estabelecimento'}
                    isEstablishment={true}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 dark:text-white truncate">
                        {detailModalItem.establishment?.establishmentProfile?.businessName || detailModalItem.establishment?.name || 'Estabelecimento'}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">Estabelecimento</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {detailModalItem.establishment?.email || detailModalItem.establishment?.phone || 'Sem contato'}
                    </p>
                  </div>
                </div>

                {/* Profissional (se houver) */}
                {detailModalItem.professional && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-neutral-200/60 dark:border-[#313335]">
                    <Avatar
                      src={detailModalItem.professional.avatar || detailModalItem.professional.professionalProfile?.workplacePhoto}
                      fallbackSrc={detailModalItem.professional.defaultAvatar}
                      name={detailModalItem.professional.name || 'Profissional'}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white truncate">
                          {detailModalItem.professional.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">Profissional</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {detailModalItem.professional.professionalProfile?.specialty || detailModalItem.professional.email || 'Especialista'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-[#131314] border-t border-neutral-200 dark:border-[#313335] flex justify-end">
              <button
                onClick={handleCloseDetailModal}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
