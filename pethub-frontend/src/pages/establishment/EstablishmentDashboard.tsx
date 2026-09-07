import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  Users, 
  PawPrint, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  Package, 
  TrendingUp, 
  ChevronRight,
  Plus,
  Pause,
  CheckCircle2,
  BarChart2,
  Star,
  Trophy
} from 'lucide-react';
import { Button, Badge, Avatar } from '@/components/ui';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface DashboardData {
  hasData: boolean;
  revenue: number;
  appointmentRevenue: number;
  productRevenue: number;
  appointments: {
    today: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  orders: {
    pending: number;
    completed: number;
  };
  clientsCount: number;
  petsCount: number;
  topProducts: {
    name: string;
    photo: string | null;
    quantity: number;
    revenue: number;
  }[];
  revenueChart: {
    date: string;
    amount: number;
  }[];
  averageRating: number;
}

export default function EstablishmentDashboard() {
  const { currentUser } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const establishmentProfile = (currentUser as any)?.establishmentProfile;
  const isPendingApproval = establishmentProfile?.status === 'PENDING_APPROVAL';
  const isSuspended = establishmentProfile?.status === 'SUSPENDED';
  const businessName = establishmentProfile?.businessName || currentUser?.name || 'Seu Estabelecimento';
  const photoSrc = establishmentProfile?.photos?.[0] || currentUser?.avatar;

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/establishment/dashboard?period=${period}`);
      setData(res.data);
    } catch (err) {
      console.error('Error loading establishment dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const { isDark } = useThemeStore();

  // Format X-axis date cleanly according to point density
  const formatXAxisDate = (dateStr: string, totalCount: number): string => {
    if (!dateStr) return '';
    if (['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom', 'Hoje'].includes(dateStr)) {
      return dateStr;
    }
    const match = dateStr.match(/^(\d{1,2})/);
    if (!match) return dateStr;
    const dayNum = match[1];

    // For dense charts (> 10 points, e.g. 30 days), show just day number (17, 18, 19...)
    if (totalCount > 10) {
      return dayNum;
    }

    // For fewer points, show clean short month (17 ago)
    const monthMatch = dateStr.match(/([a-zA-Z]{3})/i);
    if (monthMatch && monthMatch[1].toLowerCase() !== 'de') {
      return `${dayNum} ${monthMatch[1].toLowerCase()}`;
    }

    return dayNum;
  };

  const chartData = (data?.revenueChart && data.revenueChart.length > 0)
    ? data.revenueChart
    : [
        { date: 'Seg', amount: 0 },
        { date: 'Ter', amount: 0 },
        { date: 'Qua', amount: 0 },
        { date: 'Qui', amount: 0 },
        { date: 'Sex', amount: 0 },
        { date: 'Sáb', amount: 0 },
        { date: 'Dom', amount: 0 },
      ];

  const totalPoints = chartData.length;
  // Adaptive tick frequency: ~5-7 ticks evenly distributed to prevent crowded/overlapping labels
  const adaptiveInterval = totalPoints > 20 ? Math.ceil(totalPoints / 7) : totalPoints > 10 ? 2 : 0;

  const CustomRevenueTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-neutral-900/95 dark:bg-[#282A2C]/95 backdrop-blur-md text-white dark:text-[#E3E3E3] border border-neutral-700/80 dark:border-[#313335] px-3.5 py-2 rounded-xl shadow-xl text-xs space-y-0.5 pointer-events-none z-30">
          <p className="font-semibold text-neutral-300 dark:text-[#C4C7C5]">{point.date}</p>
          <p className="font-bold text-orange-400 text-sm">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(point.amount || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  const maxRevenuePoint = data?.revenueChart?.length 
    ? Math.max(...data.revenueChart.map(p => p.amount), 1)
    : 1;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header with Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={photoSrc}
            name={businessName}
            size="xl"
            isEstablishment={true}
            square={true}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Olá, {businessName}</h1>
              {isSuspended ? (
                <Badge variant="warning" className="inline-flex items-center gap-1"><Pause size={11} /> Suspenso</Badge>
              ) : isPendingApproval ? (
                <Badge variant="default" className="inline-flex items-center gap-1"><Clock size={11} /> Em Análise</Badge>
              ) : (
                <Badge variant="success" className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> Ativo</Badge>
              )}
            </div>
            <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
              Painel de controle e desempenho do seu negócio em Ourinhos - SP
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
        <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-800/60 rounded-3xl p-6 shadow-xs text-orange-950 dark:text-orange-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-orange-950 dark:text-orange-200 text-base">
                Estabelecimento Temporariamente Suspenso
              </h3>
              <p className="text-xs sm:text-sm text-orange-900 dark:text-orange-300 leading-relaxed">
                Seu estabelecimento está com as funcionalidades restritas temporariamente {establishmentProfile?.suspendedUntil ? `até ${new Date(establishmentProfile.suspendedUntil).toLocaleString('pt-BR')}` : ''}.
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-200 bg-white/70 dark:bg-[#282A2C]/70 p-3 rounded-xl border border-orange-200 dark:border-orange-800/40">
                <span className="font-bold">Motivo:</span> {establishmentProfile?.suspensionReason || 'Violação das diretrizes da plataforma.'}
              </p>
              <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-1">
                A reativação da conta ocorrerá automaticamente após o término do período de suspensão.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Checklist Banner */}
      {isPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Seu estabelecimento está em análise pela equipe administrativa
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Você já pode preparar seu negócio cadastrando serviços, produtos, fotos e horários. Assim que o administrador aprovar, suas páginas ficarão públicas para os tutores de Ourinhos.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <Link
                  to="/estabelecimento/perfil"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Completar Perfil & Horários →
                </Link>
                <Link
                  to="/estabelecimento/servicos"
                  className="px-3 py-1.5 bg-white dark:bg-[#282A2C] border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Cadastrar Serviços
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Total</span>
            <div className="w-9 h-9 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              R$ {data ? data.revenue.toFixed(2).replace('.', ',') : '0,00'}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 dark:text-[#C4C7C5] pt-1 border-t border-neutral-50 dark:border-[#313335]">
            <span>Serviços: R$ {data ? data.appointmentRevenue.toFixed(2).replace('.', ',') : '0,00'}</span>
            <span>Produtos: R$ {data ? data.productRevenue.toFixed(2).replace('.', ',') : '0,00'}</span>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Agendamentos</span>
            <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data?.appointments.today || 0}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] ml-1.5 font-medium">hoje</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 dark:text-[#C4C7C5] pt-1 border-t border-neutral-50 dark:border-[#313335]">
            <span>Próximos: {data?.appointments.upcoming || 0}</span>
            <span className="text-green-600 dark:text-green-400 font-bold">Concluídos: {data?.appointments.completed || 0}</span>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Pedidos</span>
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data?.orders.pending || 0}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] ml-1.5 font-medium">pendentes</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 dark:text-[#C4C7C5] pt-1 border-t border-neutral-50 dark:border-[#313335]">
            <span>Entregues: {data?.orders.completed || 0}</span>
            <Link to="/estabelecimento/pedidos" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
              Ver pedidos →
            </Link>
          </div>
        </div>

        {/* Clientes & Pets */}
        <div className="bg-white dark:bg-[#1E1F20] p-5 rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 dark:text-[#8E918F]">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes e Pets</span>
            <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
              <PawPrint size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {data?.clientsCount || 0}
            </span>
            <span className="text-xs text-neutral-400 dark:text-[#8E918F] ml-1.5 font-medium">clientes</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 dark:text-[#C4C7C5] pt-1 border-t border-neutral-50 dark:border-[#313335]">
            <span>{data?.petsCount || 0} pets atendidos</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
              <Star size={12} className="fill-amber-400 text-amber-400" /> {data?.averageRating.toFixed(1) || '5.0'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Revenue Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">Evolução da Receita</h2>
              <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-0.5">Faturamento real com agendamentos e vendas no período</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg">
              R$ {data ? data.revenue.toFixed(2).replace('.', ',') : '0,00'}
            </span>
          </div>

          {loading ? (
            <div className="h-64 sm:h-72 flex items-center justify-center text-neutral-400 dark:text-[#8E918F] text-xs">
              Carregando dados reais do PostgreSQL...
            </div>
          ) : (
            <div className="relative h-64 sm:h-72 w-full pt-1">
              {/* Subtle watermark notice when empty */}
              {(!data?.hasData || data.revenue === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4 text-center">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-[#C4C7C5] bg-white/90 dark:bg-[#282A2C]/90 px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-[#313335] shadow-xs inline-flex items-center gap-1.5">
                    <BarChart2 size={13} className="text-neutral-400" /> Ainda não há dados suficientes para exibir tendências
                  </span>
                  <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1 max-w-sm">
                    Conforme seus agendamentos e vendas forem concluídos, a curva de faturamento real aparecerá aqui.
                  </p>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 12, left: -6, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? '#313335' : '#E5E7EB'}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={{ stroke: isDark ? '#313335' : '#E5E7EB' }}
                    tickLine={false}
                    tick={{ fill: isDark ? '#8E918F' : '#6B7280', fontSize: 11 }}
                    interval={adaptiveInterval}
                    tickFormatter={(val) => formatXAxisDate(val, totalPoints)}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tick={{ fill: isDark ? '#8E918F' : '#6B7280', fontSize: 11 }}
                    tickFormatter={(val) =>
                      val === 0 ? 'R$ 0' : `R$ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                    }
                  />
                  <Tooltip content={<CustomRevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                    dot={totalPoints <= 7 && (data?.revenue ?? 0) > 0 ? { r: 3, fill: '#F97316' } : false}
                    activeDot={{ r: 5, fill: '#F97316', stroke: isDark ? '#1E1F20' : '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Sold Products Ranking */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">Produtos Mais Vendidos</h2>
            <Link to="/estabelecimento/produtos" className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline">
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-neutral-400 dark:text-[#8E918F] text-xs">
              Carregando ranking...
            </div>
          ) : !data?.topProducts || data.topProducts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-neutral-50/50 dark:bg-[#282A2C]/40 rounded-xl border border-dashed border-neutral-200 dark:border-[#313335]">
              <Package size={32} className="text-neutral-300 dark:text-[#8E918F] mb-2" />
              <p className="font-bold text-neutral-700 dark:text-[#C4C7C5] text-xs">Nenhum produto vendido ainda</p>
              <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-0.5">As vendas realizadas comporão o ranking de produtos desta seção.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.topProducts.map((prod, idx) => {
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-colors border ${
                      idx === 0 
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40' 
                        : idx === 1 
                        ? 'bg-neutral-50/80 dark:bg-[#282A2C]/60 border-neutral-200/70 dark:border-[#313335]' 
                        : idx === 2 
                        ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30' 
                        : 'bg-white dark:bg-[#1E1F20] border-transparent hover:bg-neutral-50 dark:hover:bg-[#282A2C]'
                    }`}
                  >
                    <div className="w-7 flex items-center justify-center shrink-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          : idx === 1
                          ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'
                          : idx === 2
                          ? 'bg-amber-200/60 text-amber-900 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'text-neutral-400 dark:text-[#8E918F]'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#282A2C] flex items-center justify-center overflow-hidden shrink-0 border border-neutral-200/60 dark:border-[#313335] shadow-2xs">
                      {prod.photo ? (
                        <img src={prod.photo} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-neutral-400 dark:text-[#8E918F]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-xs truncate">{prod.name}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">{prod.quantity} {prod.quantity === 1 ? 'unidade vendida' : 'unidades vendidas'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-xs block">
                        R$ {prod.revenue.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">total faturado</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
