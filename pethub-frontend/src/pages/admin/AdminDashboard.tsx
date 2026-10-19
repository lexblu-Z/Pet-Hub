import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  Users,
  Building2,
  Stethoscope,
  PawPrint,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '@/services/api';
import { useThemeStore } from '@/store/themeStore';

interface AlertItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

export default function AdminDashboard() {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y'>('30d');
  const [chartMetric, setChartMetric] = useState<'users' | 'appointments' | 'revenue'>('revenue');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [dashRes, alertsRes, chartRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/dashboard/alerts'),
          api.get(`/admin/dashboard/performance?period=${chartPeriod}`),
        ]);
        setStats(dashRes.data);
        setAlerts(alertsRes.data || []);
        setChartData(chartRes.data || []);
      } catch (err: any) {
        console.error('Failed to load operational dashboard data', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          useAuthStore.getState().logout();
          navigate('/auth/login', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [chartPeriod]);

  const handlePeriodChange = async (p: '7d' | '30d' | '3m' | '6m' | '1y') => {
    setChartPeriod(p);
    try {
      const res = await api.get(`/admin/dashboard/performance?period=${p}`);
      setChartData(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Painel Administrativo</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Visão geral da operação do PetHub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/financeiro"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <DollarSign size={14} /> Ver Financeiro
          </Link>
          <Link
            to="/admin/agendamentos"
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Calendar size={14} /> Agenda Universal
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Usuários */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Usuários</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? '...' : stats?.users ?? 0}
            </p>
            {stats?.comparisons?.users?.today !== undefined && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                +{stats.comparisons.users.today} hoje · +{stats.comparisons.users.last7Days} nos 7d
              </p>
            )}
          </div>
        </div>

        {/* Total Pets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pets</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <PawPrint size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? '...' : stats?.pets ?? 0}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Cadastrados na plataforma</p>
          </div>
        </div>

        {/* Estabelecimentos Ativos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Estabelecimentos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? '...' : stats?.activeEstablishments ?? 0}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {stats?.pendingEstablishments > 0 ? (
                <span className="text-amber-500 font-medium">+{stats.pendingEstablishments} pendente(s)</span>
              ) : (
                '100% ativos'
              )}
            </p>
          </div>
        </div>

        {/* Profissionais */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Profissionais</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Stethoscope size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? '...' : stats?.professionals ?? 0}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {stats?.pendingProfessionals > 0 ? (
                <span className="text-amber-500 font-medium">+{stats.pendingProfessionals} pendente(s)</span>
              ) : (
                'Cadastrados'
              )}
            </p>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Agendamentos</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? '...' : stats?.appointments ?? 0}
            </p>
            {stats?.comparisons?.appointments?.today !== undefined && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                +{stats.comparisons.appointments.today} hoje · +{stats.comparisons.appointments.last7Days} nos 7d
              </p>
            )}
          </div>
        </div>

        {/* Faturamento */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Faturamento</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {isLoading
                ? '...'
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.revenue ?? 0)}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Volume bruto transacionado</p>
          </div>
        </div>
      </div>

      {/* Central de Alertas Operacionais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Central de Alertas Operacionais</h2>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {alerts.length} item(ns) requerem atenção
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-6 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">Nenhum alerta pendente</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                A operação do PetHub está normalizada. Todos os cadastros e transações estão em dia.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        alert.priority === 'URGENTE'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : alert.priority === 'ALTA'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {alert.priority}
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white">
                      {alert.count}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{alert.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {alert.description}
                  </p>
                </div>
                <div className="pt-4 mt-2 border-t border-neutral-100 dark:border-[#313335]">
                  <Link
                    to={alert.actionUrl}
                    className="w-full flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700"
                  >
                    <span>{alert.actionLabel}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desempenho da Plataforma (Gráfico Real) */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />
              <span>Desempenho da Plataforma</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Métricas reais agregadas a partir do banco de dados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Switcher */}
            <div className="flex items-center bg-neutral-100 dark:bg-[#131314] p-1 rounded-xl border border-neutral-200 dark:border-[#313335]">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  chartMetric === 'revenue'
                    ? 'bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                Faturamento
              </button>
              <button
                onClick={() => setChartMetric('appointments')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  chartMetric === 'appointments'
                    ? 'bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                Agendamentos
              </button>
              <button
                onClick={() => setChartMetric('users')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  chartMetric === 'users'
                    ? 'bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                Usuários
              </button>
            </div>

            {/* Period Switcher */}
            <div className="flex items-center bg-neutral-100 dark:bg-[#131314] p-1 rounded-xl border border-neutral-200 dark:border-[#313335]">
              {(['7d', '30d', '3m', '6m', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    chartPeriod === p
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#313335' : '#f1f5f9'} />
              <XAxis
                dataKey="date"
                stroke={isDark ? '#8E918F' : '#94a3b8'}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={isDark ? '#8E918F' : '#94a3b8'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (chartMetric === 'revenue' ? `R$${val}` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1E1F20' : '#ffffff',
                  borderColor: isDark ? '#313335' : '#e2e8f0',
                  borderRadius: '12px',
                  color: isDark ? '#ffffff' : '#0f172a',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [
                  chartMetric === 'revenue'
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
                    : `${val} cadastros/eventos`,
                  chartMetric === 'revenue' ? 'Faturamento' : chartMetric === 'appointments' ? 'Agendamentos' : 'Novos Usuários',
                ]}
              />
              <Area
                type="monotone"
                dataKey={chartMetric}
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorMetric)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Recent Appointments & Species Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Platform Appointments */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              <span>Agendamentos Recentes da Plataforma</span>
            </h3>
            <Link
              to="/admin/agendamentos"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#313335] text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Tutor / Pet</th>
                  <th className="pb-3">Serviço</th>
                  <th className="pb-3">Data / Hora</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
                {stats?.recentAppointments?.map((app: any) => (
                  <tr key={app.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3 font-semibold text-xs text-neutral-900 dark:text-white">
                      {app.code}
                    </td>
                    <td className="py-3 text-xs">
                      <span className="font-medium text-neutral-900 dark:text-white">{app.tutorName}</span>
                      <span className="text-neutral-400 block text-[11px]">{app.petName}</span>
                    </td>
                    <td className="py-3 text-xs text-neutral-600 dark:text-neutral-300">
                      {app.serviceName || 'Serviço'}
                    </td>
                    <td className="py-3 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(app.date).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    </td>
                    <td className="py-3 text-xs text-right font-medium text-neutral-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.price || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Species Distribution Card */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <PawPrint size={18} className="text-orange-500" />
              <span>Espécies Cadastradas</span>
            </h3>
            <Link
              to="/admin/pets"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Gestão de pets
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {stats?.rankings?.topSpecies?.map((item: any) => {
              const total = stats?.pets || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.species} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
                      {item.species}
                    </span>
                    <span className="text-neutral-400">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-[#131314] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-[#313335] text-xs text-neutral-400">
            Base total de animais atendidos pelo ecossistema PetHub.
          </div>
        </div>
      </div>
    </div>
  );
}
