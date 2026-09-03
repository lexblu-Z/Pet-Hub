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
} from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';
import { Link } from 'react-router-dom';

interface DashboardData {
  todayAppointments: number;
  upcomingAppointments: number;
  patientsAttended: number;
  averageRating: number | null;
  todaySchedule: Array<{
    id: string;
    time: string;
    date: string;
    petName: string;
    petSpecies: string;
    petBreed: string | null;
    petPhoto: string | null;
    tutorName: string;
    tutorPhoto: string | null;
    tutorPhone: string | null;
    service: string;
    status: string;
    price: number;
    duration: number;
  }>;
}

export default function ProfessionalDashboard() {
  const { currentUser } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<DashboardData>({
    todayAppointments: 0,
    upcomingAppointments: 0,
    patientsAttended: 0,
    averageRating: null,
    todaySchedule: [],
  });
  const [loading, setLoading] = useState(true);

  const profProfile = (currentUser as any)?.professionalProfile;
  const isPendingApproval = profProfile?.status === 'PENDING_APPROVAL' || !profProfile?.status;
  const isSuspended = profProfile?.status === 'SUSPENDED';
  const userName = currentUser?.name || 'Profissional';
  const specialty = profProfile?.specialty || 'Médico Veterinário';
  const photoSrc = currentUser?.avatar || '/user.jpg';

  // 100% REAL DATA FROM BACKEND API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/professional/dashboard?period=${period}`);
        setData(res.data);
      } catch (err) {
        console.error('Error fetching professional dashboard:', err);
        setData({
          todayAppointments: 0,
          upcomingAppointments: 0,
          patientsAttended: 0,
          averageRating: null,
          todaySchedule: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header with Avatar - Identical to Establishment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={photoSrc}
            name={userName}
            size="xl"
            fallbackSrc="/user.jpg"
            entityType="professional"
            square={true}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-neutral-900">Olá, {userName} 👋</h1>
              {isSuspended ? (
                <Badge variant="warning">⏸️ Suspenso</Badge>
              ) : isPendingApproval ? (
                <Badge variant="default">⏳ Em Análise</Badge>
              ) : (
                <Badge variant="success">✓ Ativo</Badge>
              )}
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">
              {specialty} • Profissional PetHub Ourinhos - SP
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 font-semibold hidden sm:inline">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
            <option value="year">Este ano</option>
          </select>
        </div>
      </div>

      {/* Suspended Alert Banner - Identical to Establishment */}
      {isSuspended && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-6 shadow-xs text-orange-950">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-orange-950 text-base">
                Perfil Profissional Temporariamente Suspenso
              </h3>
              <p className="text-xs sm:text-sm text-orange-900 leading-relaxed">
                Seu acesso aos atendimentos está suspenso temporariamente{profProfile?.suspendedUntil ? ` até ${new Date(profProfile.suspendedUntil).toLocaleString('pt-BR')}` : ''}.
              </p>
              <p className="text-xs text-orange-800 bg-white/70 p-3 rounded-xl border border-orange-200">
                <span className="font-bold">Motivo:</span> {profProfile?.suspensionReason || 'Violação das diretrizes da plataforma.'}
              </p>
              <p className="text-[11px] text-orange-700 mt-1">
                A reativação da conta ocorrerá automaticamente após o término do período de suspensão.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Checklist Banner - Identical to Establishment */}
      {isPendingApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-amber-900 text-sm">
                Seu cadastro profissional está em análise pela equipe administrativa
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
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
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors"
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
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Atendimentos Hoje</span>
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data.todayAppointments}
            </span>
            <span className="text-xs text-neutral-400 font-medium ml-2">consultas hoje</span>
          </div>
        </div>

        {/* Próximos Agendamentos */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Próximos Agendamentos</span>
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data.upcomingAppointments}
            </span>
            <span className="text-xs text-neutral-400 font-medium ml-2">na fila de espera</span>
          </div>
        </div>

        {/* Pacientes Atendidos */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pacientes Atendidos</span>
            <div className="w-9 h-9 bg-neutral-100 text-neutral-700 rounded-xl flex items-center justify-center">
              <PawPrint size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data.patientsAttended}
            </span>
            <span className="text-xs text-neutral-400 font-medium ml-2">pacientes únicos</span>
          </div>
        </div>

        {/* Avaliação Média */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avaliação Média</span>
            <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
              <Star size={18} className="fill-amber-400" />
            </div>
          </div>
          <div>
            {data.averageRating !== null ? (
              <>
                <span className="text-2xl font-black text-neutral-900">
                  {data.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400 font-medium ml-2">★★★★★</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-neutral-400">—</span>
                <span className="text-xs text-neutral-400 font-medium ml-2">Sem avaliações</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Daily Appointments / Recent Agenda */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-bold text-neutral-900">
            <Calendar size={18} className="text-orange-500" />
            <span>Consultas e Procedimentos de Hoje</span>
          </div>
          <Link
            to="/profissional/agenda"
            className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
          >
            Ver agenda completa <ChevronRight size={14} />
          </Link>
        </div>

        {data.todaySchedule.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
            <Stethoscope size={40} className="mx-auto text-neutral-300 mb-3" />
            <h4 className="font-bold text-neutral-800 text-sm mb-1">Nenhum atendimento agendado para hoje</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
              Assim que tutores realizarem agendamentos com você, eles aparecerão aqui.
            </p>
            <Link
              to="/profissional/agenda"
              className="inline-flex items-center text-xs text-orange-600 hover:text-orange-700 font-bold"
            >
              Ver minha agenda →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.todaySchedule.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3 hover:border-orange-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Time & Service */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 text-orange-700 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border border-orange-100">
                      <Clock size={16} />
                      <span className="text-xs mt-0.5">{apt.time}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 text-base">{apt.service}</span>
                        <Badge variant={apt.status === 'CONFIRMED' ? 'success' : apt.status === 'IN_PROGRESS' ? 'brand' : 'warning'}>
                          {apt.status === 'CONFIRMED' ? 'Confirmado' : apt.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Agendado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="font-semibold text-neutral-800 flex items-center gap-1">
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
                  <div className="flex items-center gap-2 justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                    <Link
                      to="/profissional/agenda"
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      Acessar Ficha
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
