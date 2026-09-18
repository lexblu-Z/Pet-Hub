import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileDown,
  Download,
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Sparkles,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { api } from '@/services/api';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AdminFinancialPage() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<string>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchFinance = async (isFirst = false) => {
    if (isFirst || !data) {
      setIsInitialLoading(true);
    } else {
      setIsRefetching(true);
    }
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom' && startDate) {
        params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      const res = await api.get(`/admin/finance/overview?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setIsInitialLoading(false);
      setIsRefetching(false);
    }
  };

  const [partnerOverview, setPartnerOverview] = useState<any>(null);

  const fetchPartnerOverview = async () => {
    try {
      const res = await api.get('/admin/partner-program/overview');
      setPartnerOverview(res.data);
    } catch (err) {
      console.error('Failed to load partner program overview', err);
    }
  };

  const handleUpdatePayoutStatus = async (id: string, status: 'APPROVED' | 'PAID') => {
    try {
      await api.patch(`/admin/partner-program/payouts/${id}/status`, { status });
      fetchPartnerOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar repasse');
    }
  };

  useEffect(() => {
    fetchFinance(!data);
    fetchPartnerOverview();
  }, [period]);

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate) fetchFinance();
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        type: 'finance',
        format,
        period,
      });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/admin/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pethub_financeiro_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // PetHub orange palette for financial charts
  const chartPalette = ['#ea580c', '#f97316', '#fb923c', '#fdba74'];

  const rawMethods = [
    { key: 'PIX', name: 'Pix', value: data?.paymentMethods?.PIX?.total || 0, count: data?.paymentMethods?.PIX?.count || 0, method: 'pix' },
    { key: 'CREDIT_CARD', name: 'Cartão de Crédito', value: data?.paymentMethods?.CREDIT_CARD?.total || 0, count: data?.paymentMethods?.CREDIT_CARD?.count || 0, method: 'credito' },
    { key: 'DEBIT_CARD', name: 'Cartão de Débito', value: data?.paymentMethods?.DEBIT_CARD?.total || 0, count: data?.paymentMethods?.DEBIT_CARD?.count || 0, method: 'debito' },
    { key: 'CASH', name: 'Dinheiro', value: data?.paymentMethods?.CASH?.total || 0, count: data?.paymentMethods?.CASH?.count || 0, method: 'dinheiro' },
  ];

  const totalVolume = rawMethods.reduce((acc, curr) => acc + curr.value, 0);
  const activeChartData = rawMethods.filter((m) => m.value > 0);
  const displayChartData = activeChartData.length > 0 ? activeChartData : [{ name: 'Sem movimentação', value: 1, method: 'pix' }];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <DollarSign size={24} className="text-orange-500" />
            <span>Central Financeira</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Consolidação contábil, taxas da plataforma e faturamento real
          </p>
        </div>

        {/* Exports: PDF (Highlighted) & CSV */}
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

      {/* Period Filter Bar */}
      <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' },
            { id: 'year', label: 'Este Ano' },
            { id: 'custom', label: 'Personalizado' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                period === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-[#131314] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {isRefetching && (
            <span className="text-xs text-orange-500 font-semibold animate-pulse flex items-center gap-1.5 ml-2">
              <Clock size={13} /> Atualizando dados...
            </span>
          )}
        </div>

        {period === 'custom' && (
          <form onSubmit={handleApplyCustomDates} className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white"
            />
            <span className="text-xs text-neutral-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-semibold rounded-xl"
            >
              Filtrar
            </button>
          </form>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${isRefetching ? 'opacity-75' : 'opacity-100'}`}>
        {/* Faturamento Bruto */}
        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Faturamento Bruto</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isInitialLoading ? '...' : formatBRL(data?.kpis?.grossRevenue)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {data?.kpis?.completedCount || 0} transações concluídas
            </p>
          </div>
        </div>

        {/* Faturamento Líquido */}
        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Faturamento Líquido</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isInitialLoading ? '...' : formatBRL(data?.kpis?.netRevenue)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Deduzido taxas (10%) e cashback</p>
          </div>
        </div>

        {/* Taxas da Plataforma */}
        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Taxas Plataforma (10%)</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
              <Percent size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {isInitialLoading ? '...' : formatBRL(data?.kpis?.platformFees)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Receita direta estimada PetHub</p>
          </div>
        </div>

        {/* Cashback Utilizado */}
        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cashback Utilizado</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Sparkles size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {isInitialLoading ? '...' : formatBRL(data?.kpis?.totalCashbackUsed)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Resgatado pelos tutores</p>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown: Recharts Donut Chart + Legend Cards */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-orange-500" />
            <span>Distribuição por Métodos de Pagamento</span>
          </h2>
          <span className="text-xs text-neutral-400 font-medium">
            Volume Total Consolidado: <strong className="text-neutral-900 dark:text-white">{formatBRL(totalVolume)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
          {/* Recharts Donut Chart with clean center */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
            <div className="w-full h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={displayChartData.length > 1 ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {displayChartData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartPalette[index % chartPalette.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatBRL(Number(val)), 'Volume']}
                    contentStyle={{
                      backgroundColor: '#1E1F20',
                      borderColor: '#313335',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Clean modern center summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">
                  Volume Total
                </span>
                <span className="text-base font-extrabold text-neutral-900 dark:text-white">
                  {formatBRL(totalVolume)}
                </span>
                <span className="text-[10px] text-orange-500 font-semibold">
                  {data?.kpis?.completedCount || 0} transações
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Legend & Detailed Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {rawMethods.map((m, idx) => {
              const pct = totalVolume > 0 ? ((m.value / totalVolume) * 100).toFixed(1) : '0.0';
              const color = chartPalette[idx % chartPalette.length];
              return (
                <div
                  key={m.key}
                  className="p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-[#1E1F20] flex items-center justify-center shrink-0">
                      <PaymentLogo method={m.method} size="sm" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-xs font-bold text-neutral-900 dark:text-white">{m.name}</p>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {m.count} transação(ões) • <span className="font-semibold text-orange-600 dark:text-orange-400">{pct}%</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white text-right">
                    {formatBRL(m.value)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transactions Table - Stabilized without height jitter / tremedeira */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs overflow-hidden min-h-[380px]">
        <div className="p-4 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Detalhamento de Transações Recentes
            </h2>
            {isRefetching && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-500 animate-pulse">
                <Clock size={12} /> Atualizando...
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-400">
            {data?.transactions?.length || 0} registro(s) exibido(s)
          </span>
        </div>

        <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? 'opacity-65 pointer-events-none' : 'opacity-100'}`}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Cliente / Tutor</th>
                <th className="px-5 py-3">Prestador / Loja</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
              {isInitialLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-neutral-400 text-xs">
                    Carregando transações contábeis...
                  </td>
                </tr>
              ) : !data?.transactions || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-neutral-400 text-xs">
                    Nenhuma transação registrada no período.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="px-5 py-3.5 font-bold text-xs text-neutral-900 dark:text-white">
                      {tx.code}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#131314] font-semibold text-[10px] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-[#313335]">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {tx.customerName}
                      </span>
                      <span className="text-neutral-400 text-[11px]">{tx.customerEmail}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-700 dark:text-neutral-300">
                      {tx.providerName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <PaymentLogo method={tx.paymentMethod} size="xs" />
                        <span>{tx.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'COMPLETED' || tx.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tx.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-right font-bold text-neutral-900 dark:text-white">
                      {formatBRL(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Programa de Parceiros dos Planos */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200 dark:border-[#313335] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Programa de Parceiros dos Planos
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Adesão voluntária de estabelecimentos e controle de repasses calculados (70%)
              </p>
            </div>
          </div>
          {partnerOverview?.stats && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20">
                {partnerOverview.stats.activePartners} parceiro(s) ativo(s)
              </span>
              <span className="px-3 py-1 bg-neutral-100 dark:bg-[#131314] text-neutral-600 dark:text-neutral-400 rounded-xl text-xs font-bold border border-neutral-200 dark:border-[#313335]">
                {partnerOverview.stats.declinedPartners} recusado(s)
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {partnerOverview?.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#131314] border border-neutral-200 dark:border-[#313335]">
              <p className="text-xs text-neutral-500">Repasses Calculados (A liquidar)</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                {formatBRL(partnerOverview.stats.totalPayoutsCalculated)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Repasses Aprovados</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatBRL(partnerOverview.stats.totalPayoutsApproved)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Repasses Quitados</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBRL(partnerOverview.stats.totalPayoutsPaid)}
              </p>
            </div>
          </div>
        )}

        {/* Payouts Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Receipt size={16} className="text-emerald-500" />
            <span>Repasses Recentes do Programa</span>
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-[#313335]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-[#131314] text-[11px] text-neutral-500 font-bold border-b border-neutral-200 dark:border-[#313335]">
                  <th className="px-4 py-3">Estabelecimento</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Valor Serviço</th>
                  <th className="px-4 py-3">Repasse (70%)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#313335] text-xs">
                {!partnerOverview?.payouts || partnerOverview.payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-neutral-400 text-xs">
                      Nenhum repasse registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  partnerOverview.payouts.map((po: any) => (
                    <tr key={po.id} className="hover:bg-neutral-50/50 dark:hover:bg-[#131314]/50">
                      <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                        {po.establishment?.establishmentProfile?.businessName || po.establishment?.name || 'Estabelecimento'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        {po.serviceName}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {po.periodMonth}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        {formatBRL(po.servicePrice)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(po.payoutAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : po.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        {po.status === 'CALCULATED' && (
                          <button
                            onClick={() => handleUpdatePayoutStatus(po.id, 'APPROVED')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                        {po.status !== 'PAID' && (
                          <button
                            onClick={() => handleUpdatePayoutStatus(po.id, 'PAID')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
