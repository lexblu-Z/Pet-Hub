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
  Plus
} from 'lucide-react';
import { Button, Badge, Avatar } from '@/components/ui';
import { Link } from 'react-router-dom';

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
              <h1 className="text-2xl font-bold text-neutral-900">{businessName}</h1>
              {isSuspended ? (
                <Badge variant="warning">⏸️ Suspenso</Badge>
              ) : isPendingApproval ? (
                <Badge variant="default">⏳ Em Análise</Badge>
              ) : (
                <Badge variant="success">✓ Ativo</Badge>
              )}
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">
              Painel de controle e desempenho do seu negócio em Ourinhos - SP
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

      {/* Suspended Alert Banner */}
      {isSuspended && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-6 shadow-xs text-orange-950">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-orange-950 text-base">
                Estabelecimento Temporariamente Suspenso
              </h3>
              <p className="text-xs sm:text-sm text-orange-900 leading-relaxed">
                Seu estabelecimento está com as funcionalidades restritas temporariamente {establishmentProfile?.suspendedUntil ? `até ${new Date(establishmentProfile.suspendedUntil).toLocaleString('pt-BR')}` : ''}.
              </p>
              <p className="text-xs text-orange-800 bg-white/70 p-3 rounded-xl border border-orange-200">
                <span className="font-bold">Motivo:</span> {establishmentProfile?.suspensionReason || 'Violação das diretrizes da plataforma.'}
              </p>
              <p className="text-[11px] text-orange-700 mt-1">
                A reativação da conta ocorrerá automaticamente após o término do período de suspensão.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Checklist Banner */}
      {isPendingApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-amber-900 text-sm">
                Seu estabelecimento está em análise pela equipe administrativa
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
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
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors"
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
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Total</span>
            <div className="w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              R$ {data ? data.revenue.toFixed(2).replace('.', ',') : '0,00'}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-50">
            <span>Serviços: R$ {data ? data.appointmentRevenue.toFixed(2).replace('.', ',') : '0,00'}</span>
            <span>Produtos: R$ {data ? data.productRevenue.toFixed(2).replace('.', ',') : '0,00'}</span>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Agendamentos</span>
            <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data?.appointments.today || 0}
            </span>
            <span className="text-xs text-neutral-400 ml-1.5 font-medium">hoje</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-50">
            <span>Próximos: {data?.appointments.upcoming || 0}</span>
            <span className="text-green-600 font-bold">Concluídos: {data?.appointments.completed || 0}</span>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pedidos</span>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data?.orders.pending || 0}
            </span>
            <span className="text-xs text-neutral-400 ml-1.5 font-medium">pendentes</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-50">
            <span>Entregues: {data?.orders.completed || 0}</span>
            <Link to="/estabelecimento/pedidos" className="text-orange-600 font-bold hover:underline">
              Ver pedidos →
            </Link>
          </div>
        </div>

        {/* Clientes & Pets */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes e Pets</span>
            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <PawPrint size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {data?.clientsCount || 0}
            </span>
            <span className="text-xs text-neutral-400 ml-1.5 font-medium">clientes</span>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-50">
            <span>{data?.petsCount || 0} pets atendidos</span>
            <span className="text-amber-600 font-semibold">★ {data?.averageRating.toFixed(1) || '5.0'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Revenue Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-neutral-900 text-base">Evolução da Receita</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Faturamento real com agendamentos e vendas no período</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-lg">
              R$ {data ? data.revenue.toFixed(2).replace('.', ',') : '0,00'}
            </span>
          </div>

          {loading ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 text-xs">
              Carregando dados reais do PostgreSQL...
            </div>
          ) : !data?.hasData || data.revenue === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
              <TrendingUp size={36} className="text-neutral-300 mb-2" />
              <p className="font-bold text-neutral-700 text-sm">Ainda não há dados suficientes para este período.</p>
              <p className="text-xs text-neutral-400 mt-1">Conforme você concluir agendamentos e pedidos, a curva de faturamento aparecerá aqui.</p>
            </div>
          ) : (
            <div className="h-56 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 px-2 overflow-x-auto">
              {data.revenueChart.map((pt, idx) => {
                const heightPercent = Math.max((pt.amount / maxRevenuePoint) * 100, 4);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group min-w-[28px]">
                    <div className="relative w-full flex items-end justify-center h-44">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow pointer-events-none transition-all z-10 whitespace-nowrap">
                        R$ {pt.amount.toFixed(2)}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[24px] bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-md transition-all group-hover:from-orange-600 group-hover:to-orange-500"
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate w-full text-center">
                      {pt.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Sold Products */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-neutral-900 text-base">Produtos Mais Vendidos</h2>
            <Link to="/estabelecimento/produtos" className="text-xs text-orange-600 font-bold hover:underline">
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-neutral-400 text-xs">
              Carregando...
            </div>
          ) : !data?.topProducts || data.topProducts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
              <Package size={32} className="text-neutral-300 mb-2" />
              <p className="font-bold text-neutral-700 text-xs">Nenhum produto vendido ainda</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Cadastre produtos para começar a vender online</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0 border border-neutral-200/60">
                    {prod.photo ? (
                      <img src={prod.photo} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-xs truncate">{prod.name}</p>
                    <p className="text-[11px] text-neutral-400">{prod.quantity} unidades vendidas</p>
                  </div>
                  <span className="font-bold text-neutral-800 text-xs">
                    R$ {prod.revenue.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-neutral-50">
            <Link
              to="/estabelecimento/produtos"
              className="w-full flex items-center justify-center gap-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-colors"
            >
              <Plus size={14} /> Adicionar Novo Produto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
