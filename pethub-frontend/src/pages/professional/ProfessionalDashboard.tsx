import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { 
  Calendar, 
  Clock, 
  PawPrint, 
  Star, 
  ChevronRight, 
  AlertTriangle, 
  Stethoscope,
  CalendarDays,
  User
} from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';
import { Link } from 'react-router-dom';
import { formatBrasiliaDate } from '@/utils/date';

interface ScheduleItem {
  id: string;
  time: string;
  date: string;
  dateISO?: string;
  isToday?: boolean;
  isTomorrow?: boolean;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petPhoto: string | null;
  tutorName: string;
  tutorPhoto: string | null;
  tutorPhone: string | null;
  service: string;
  serviceCategory?: string | null;
  status: string;
  price: number;
  duration: number;
}

interface DashboardData {
  todayAppointments: number;
  upcomingAppointments: number;
  patientsAttended: number;
  averageRating: number | null;
  todaySchedule: ScheduleItem[];
  upcomingSchedule?: ScheduleItem[];
}

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

export default function ProfessionalDashboard() {
  const { currentUser } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [scheduleView, setScheduleView] = useState<'today' | 'upcoming'>('today');
  const [data, setData] = useState<DashboardData>({
    todayAppointments: 0,
    upcomingAppointments: 0,
    patientsAttended: 0,
    averageRating: null,
    todaySchedule: [],
    upcomingSchedule: [],
  });
  const [loading, setLoading] = useState(true);

  const profProfile = (currentUser as any)?.professionalProfile;
  const isPendingApproval = profProfile?.status === 'PENDING_APPROVAL' || !profProfile?.status;
  const isSuspended = profProfile?.status === 'SUSPENDED';
  const userName = currentUser?.name || 'Profissional';
  const specialty = profProfile?.specialty || 'Médico Veterinário';
  const photoSrc = currentUser?.avatar;
  const defaultFallback = currentUser?.defaultAvatar || '/user5.jpg';

  // 100% REAL DATA FROM BACKEND API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/professional/dashboard?period=${period}`);
        setData(res.data || {
          todayAppointments: 0,
          upcomingAppointments: 0,
          patientsAttended: 0,
          averageRating: null,
          todaySchedule: [],
          upcomingSchedule: [],
        });
      } catch (err) {
        console.error('Error fetching professional dashboard:', err);
        setData({
          todayAppointments: 0,
          upcomingAppointments: 0,
          patientsAttended: 0,
          averageRating: null,
          todaySchedule: [],
          upcomingSchedule: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  const displayedList = scheduleView === 'today' ? data.todaySchedule : (data.upcomingSchedule || []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header with Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={photoSrc}
            name={userName}
            size="xl"
            fallbackSrc={defaultFallback}
            entityType="professional"
            square={true}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Olá, {userName} 👋</h1>
              {isSuspended ? (
                <Badge variant="warning">⏸️ Suspenso</Badge>
              ) : isPendingApproval ? (
                <Badge variant="default">⏳ Em Análise</Badge>
              ) : (
                <Badge variant="success">✓ Ativo</Badge>
              )}
            </div>
            <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
              {specialty} • Profissional PetHub
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 dark:text-[#8E918F] font-semibold hidden sm:inline">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-[#E3E3E3] shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
          >
            <option value="today" className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">Hoje</option>
            <option value="7days" className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">Últimos 7 dias</option>
            <option value="month" className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">Últimos 30 dias</option>
            <option value="year" className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">Este ano</option>
          </select>
        </div>
      </div>

      {/* Suspended Alert Banner */}
      {isSuspended && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-800 rounded-3xl p-6 shadow-xs text-orange-950 dark:text-orange-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-orange-950 dark:text-orange-200 text-base">
                Perfil Profissional Temporariamente Suspenso
              </h3>
              <p className="text-xs sm:text-sm text-orange-900 dark:text-orange-300 leading-relaxed">
                Seu acesso aos atendimentos está suspenso temporariamente{profProfile?.suspendedUntil ? ` até ${new Date(profProfile.suspendedUntil).toLocaleString('pt-BR')}` : ''}.
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300 bg-white/70 dark:bg-[#1E1F20]/70 p-3 rounded-xl border border-orange-200 dark:border-orange-900/40">
                <span className="font-bold">Motivo:</span> {profProfile?.suspensionReason || 'Violação das diretrizes da plataforma.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Checklist Banner */}
      {isPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                Seu cadastro profissional está em análise pela equipe administrativa
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                Você já pode preencher suas informações, CRMV, especialidades e biografia. Assim que o administrador aprovar seu cadastro, sua agenda ficará disponível para os tutores da plataforma.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <Link
                  to="/profissional/perfil"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Completar Perfil Profissional →
                </Link>
                <Link
                  to="/profissional/agenda"
                  className="px-3 py-1.5 bg-white dark:bg-[#282A2C] border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-bold transition-colors"
                >
                  Ver Minha Agenda
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row - 100% Real Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atendimentos Hoje */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Atendimentos Hoje</span>
            <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data.todayAppointments}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium ml-2">consultas hoje</span>
          </div>
        </div>

        {/* Próximos Agendamentos (SEM texto fake de 'fila de espera') */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Próximos Agendamentos</span>
            <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data.upcomingAppointments}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium ml-2">agendamentos futuros</span>
          </div>
        </div>

        {/* Pacientes Atendidos */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Pacientes Atendidos</span>
            <div className="w-9 h-9 bg-neutral-100 dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] rounded-xl flex items-center justify-center">
              <PawPrint size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data.patientsAttended}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium ml-2">pacientes únicos</span>
          </div>
        </div>

        {/* Avaliação Média */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Avaliação Média</span>
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Star size={18} className="fill-amber-400" />
            </div>
          </div>
          <div>
            {data.averageRating !== null ? (
              <>
                <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
                  {data.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium ml-2">★★★★★</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-neutral-400 dark:text-[#8E918F]">—</span>
                <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium ml-2">Sem avaliações</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Atendimentos / Próximos Agendamentos com dados REAIS */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-[#313335]">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-100 dark:bg-[#282A2C] p-1 rounded-xl">
              <button
                onClick={() => setScheduleView('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scheduleView === 'today'
                    ? 'bg-white dark:bg-[#1E1F20] text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800 dark:hover:text-[#E3E3E3]'
                }`}
              >
                Hoje ({data.todaySchedule.length})
              </button>
              <button
                onClick={() => setScheduleView('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scheduleView === 'upcoming'
                    ? 'bg-white dark:bg-[#1E1F20] text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800 dark:hover:text-[#E3E3E3]'
                }`}
              >
                Próximos Agendamentos ({(data.upcomingSchedule || []).length})
              </button>
            </div>
          </div>

          <Link
            to="/profissional/agenda"
            className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold flex items-center gap-1"
          >
            Ver agenda completa <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F]">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Carregando seus atendimentos...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335]">
            <Stethoscope size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <h4 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-sm mb-1">
              {scheduleView === 'today' ? 'Nenhum atendimento agendado para hoje' : 'Você não possui próximos agendamentos.'}
            </h4>
            <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-sm mx-auto mb-4">
              Quando tutores realizarem agendamentos com você pelo PetHub, eles aparecerão aqui com todos os detalhes.
            </p>
            <Link
              to="/profissional/agenda"
              className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold"
            >
              Abrir minha agenda →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedList.map((apt) => {
              const status = statusConfig[apt.status] || statusConfig.PENDING;
              const priceFormatted = Number(apt.price ?? 0).toFixed(2).replace('.', ',');

              // Badge do dia
              let dayBadgeLabel = formatBrasiliaDate(apt.date);
              if (apt.isToday) dayBadgeLabel = 'Hoje';
              else if (apt.isTomorrow) dayBadgeLabel = 'Amanhã';

              return (
                <div
                  key={apt.id}
                  className="bg-white dark:bg-[#282A2C] rounded-2xl border border-neutral-200/80 dark:border-[#313335] p-4 shadow-xs space-y-3 hover:border-orange-200 dark:hover:border-orange-500/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Time & Service */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border border-orange-100 dark:border-orange-900/40">
                        <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                          {dayBadgeLabel}
                        </span>
                        <span className="text-sm font-black mt-0.5">{apt.time}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-neutral-900 dark:text-[#E3E3E3] text-base">
                            {apt.service}
                          </span>
                          <Badge variant={status.badge}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-[#8E918F] mt-1">
                          <span className="font-semibold text-neutral-800 dark:text-[#E3E3E3] flex items-center gap-1">
                            <Clock size={12} className="text-orange-500" /> {apt.duration} min
                          </span>
                          <span>•</span>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            R$ {priceFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pet and Tutor details */}
                    <div className="flex items-center gap-5 text-xs">
                      {/* Pet */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1E1F20] overflow-hidden shrink-0 border border-neutral-200 dark:border-[#313335] flex items-center justify-center text-sm">
                          {apt.petPhoto ? (
                            <img src={getFullImageUrl(apt.petPhoto)} alt={apt.petName} className="w-full h-full object-cover" />
                          ) : (
                            <PawPrint size={16} className="text-neutral-400 dark:text-[#8E918F]" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.petName}</p>
                          <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">{apt.petSpecies} {apt.petBreed ? `• ${apt.petBreed}` : ''}</p>
                        </div>
                      </div>

                      {/* Tutor */}
                      <div className="flex items-center gap-2.5 border-l border-neutral-100 dark:border-[#313335] pl-4">
                        <Avatar
                          src={getFullImageUrl(apt.tutorPhoto)}
                          name={apt.tutorName}
                          size="sm"
                          fallbackSrc="/user.jpg"
                        />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.tutorName}</p>
                          <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">{apt.tutorPhone || 'Tutor'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100 dark:border-[#313335]">
                      <Link
                        to="/profissional/agenda"
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        Acessar Agenda
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
