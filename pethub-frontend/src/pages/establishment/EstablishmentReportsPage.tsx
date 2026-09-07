import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import {
  ClipboardList,
  TrendingUp,
  Users,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  DollarSign,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Calendar,
  Sparkles,
  PawPrint,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import type { ReportTab } from '@/components/reports/ReportLayout';
import { ReportFilters, DATE_PRESETS } from '@/components/reports/ReportFilters';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { ReportTable } from '@/components/reports/ReportTable';
import type { Column } from '@/components/reports/ReportTable';
import { FiscalNoticeCard } from '@/components/reports/FiscalNoticeCard';

const TABS: ReportTab[] = [
  { id: 'services', label: 'Serviços', icon: ClipboardList },
  { id: 'financial', label: 'Financeiro', icon: TrendingUp },
  { id: 'customers', label: 'Clientes & Pets', icon: Users },
  { id: 'inventory', label: 'Estoque', icon: Package },
];

const STATUS_OPTIONS = [
  { label: 'Concluído', value: 'COMPLETED' },
  { label: 'Em Andamento', value: 'IN_PROGRESS' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

export const EstablishmentReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('services');

  // Default dates: last 30 days
  const defaultDates = DATE_PRESETS[3].getDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  // Filters
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [professionalId, setProfessionalId] = useState<string>('');
  const [species, setSpecies] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Data states
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [servicesData, setServicesData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);

  // Available options loaded from backend
  const [professionalsList, setProfessionalsList] = useState<Array<{ id: string; name: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Fetch report data for active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'services') {
        const res = await api.get('/reports/establishment/services', {
          params: {
            startDate,
            endDate,
            status: status || undefined,
            serviceType: category || undefined,
            professionalId: professionalId || undefined,
          },
        });
        setServicesData(res.data);

        // Populate professionals list from productivity if available
        if (res.data?.productivity) {
          setProfessionalsList(
            res.data.productivity
              .filter((p: any) => p.id !== 'none')
              .map((p: any) => ({ id: p.id, name: p.name }))
          );
        }
        if (res.data?.servicesRanking) {
          const cats = Array.from(new Set(res.data.servicesRanking.map((s: any) => s.category).filter(Boolean))) as string[];
          setCategoriesList(cats);
        }
      } else if (activeTab === 'financial') {
        const res = await api.get('/reports/establishment/financial', {
          params: {
            startDate,
            endDate,
            paymentMethod: paymentMethod || undefined,
          },
        });
        setFinancialData(res.data);
      } else if (activeTab === 'customers') {
        const res = await api.get('/reports/establishment/customers', {
          params: {
            startDate,
            endDate,
            species: species || undefined,
          },
        });
        setCustomersData(res.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/establishment/inventory', {
          params: {
            category: category || undefined,
            lowStockOnly: lowStockOnly ? 'true' : undefined,
          },
        });
        setInventoryData(res.data);
        if (res.data?.summary?.categories) {
          setCategoriesList(res.data.summary.categories);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, status, category, professionalId, species, paymentMethod, lowStockOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset filters
  const handleResetFilters = () => {
    const d = DATE_PRESETS[3].getDates();
    setStartDate(d.start);
    setEndDate(d.end);
    setStatus('');
    setCategory('');
    setProfessionalId('');
    setSpecies('');
    setPaymentMethod('');
    setLowStockOnly(false);
  };

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/reports/establishment/export', {
        params: {
          type: activeTab,
          startDate,
          endDate,
          status: status || undefined,
          serviceType: category || undefined,
          paymentMethod: paymentMethod || undefined,
          category: category || undefined,
          species: species || undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-estabelecimento-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Format currency helper
  const fmtMoney = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Status badge renderer
  const renderStatusBadge = (st: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      COMPLETED: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
      IN_PROGRESS: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
      CONFIRMED: { label: 'Confirmado', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
      PENDING: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
      CANCELLED: { label: 'Cancelado', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
    };
    const s = map[st] || { label: st, cls: 'bg-neutral-100 text-neutral-800' };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <ReportLayout
      title="Relatórios Gerenciais"
      subtitle="Indicadores estratégicos, faturamento, clientes e estoque com dados reais persistidos no PetHub."
      badge="Gestão do Estabelecimento"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onExportCsv={handleExportCsv}
      isExporting={isExporting}
    >
      {/* Active Filters */}
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        status={activeTab === 'services' ? status : undefined}
        onStatusChange={activeTab === 'services' ? setStatus : undefined}
        statusOptions={STATUS_OPTIONS}
        category={activeTab === 'services' || activeTab === 'inventory' ? category : undefined}
        onCategoryChange={activeTab === 'services' || activeTab === 'inventory' ? setCategory : undefined}
        categories={categoriesList}
        professionalId={activeTab === 'services' ? professionalId : undefined}
        onProfessionalChange={activeTab === 'services' ? setProfessionalId : undefined}
        professionals={professionalsList}
        species={activeTab === 'customers' ? species : undefined}
        onSpeciesChange={activeTab === 'customers' ? setSpecies : undefined}
        paymentMethod={activeTab === 'financial' ? paymentMethod : undefined}
        onPaymentMethodChange={activeTab === 'financial' ? setPaymentMethod : undefined}
        lowStockOnly={activeTab === 'inventory' ? lowStockOnly : undefined}
        onLowStockChange={activeTab === 'inventory' ? setLowStockOnly : undefined}
        onReset={handleResetFilters}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent"></div>
            <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Processando indicadores reais...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: SERVIÇOS (RF17) */}
          {/* ========================================================================= */}
          {activeTab === 'services' && servicesData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <ReportSummaryCard
                  title="Total Atendimentos"
                  value={servicesData.summary.total}
                  subtitle="No período selecionado"
                  icon={Calendar}
                />
                <ReportSummaryCard
                  title="Concluídos"
                  value={servicesData.summary.completed}
                  subtitle="Finalizados com sucesso"
                  icon={CheckCircle2}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Em Andamento"
                  value={servicesData.summary.inProgress + servicesData.summary.confirmed}
                  subtitle="Confirmados ou em execução"
                  icon={Clock}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-950/40"
                />
                <ReportSummaryCard
                  title="Cancelados"
                  value={servicesData.summary.cancelled}
                  subtitle="Não realizados"
                  icon={XCircle}
                  iconColor="text-rose-600 dark:text-rose-400"
                  iconBg="bg-rose-100 dark:bg-rose-950/40"
                />
                <ReportSummaryCard
                  title="Avaliação Média"
                  value="—"
                  subtitle="Módulo não persistido"
                  notice={servicesData.summary.averageRatingNotice}
                  icon={Star}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-100 dark:bg-amber-950/40"
                />
              </div>

              {/* Productivity Breakdown & Top Services */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Productivity per Professional */}
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                    <Users size={16} className="text-orange-500" />
                    Produtividade por Profissional / Colaborador
                  </h3>
                  {servicesData.productivity.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nenhum atendimento atribuído no período.</p>
                  ) : (
                    <div className="space-y-3">
                      {servicesData.productivity.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800">
                          <div>
                            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{p.name}</p>
                            <p className="text-[11px] text-neutral-400">{p.roleOrSpecialty}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{p.total} atendimentos</span>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">({p.completed} concluídos)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Services Demand Ranking */}
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-orange-500" />
                    Ranking de Serviços Mais Demandados
                  </h3>
                  {servicesData.servicesRanking.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nenhum serviço registrado no período.</p>
                  ) : (
                    <div className="space-y-3">
                      {servicesData.servicesRanking.map((s: any, idx: number) => (
                        <div key={s.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{s.name}</p>
                              <p className="text-[11px] text-neutral-400">{s.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{s.count} vezes</span>
                            <p className="text-[10px] text-neutral-500 font-medium">{fmtMoney(s.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Appointments Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Lista Analítica de Agendamentos
                </h3>
                <ReportTable
                  data={servicesData.appointments}
                  columns={[
                    { header: 'Data e Hora', accessor: 'formattedDate' },
                    { header: 'Status', render: (row: any) => renderStatusBadge(row.status) },
                    {
                      header: 'Serviço',
                      render: (row: any) => (
                        <div>
                          <span className="font-medium">{row.service?.name}</span>
                          <span className="block text-[10px] text-neutral-400">{row.service?.category}</span>
                        </div>
                      ),
                    },
                    {
                      header: 'Valor',
                      render: (row: any) => (
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {fmtMoney(row.service?.price)}
                        </span>
                      ),
                    },
                    {
                      header: 'Cliente / Tutor',
                      render: (row: any) => (
                        <div>
                          <p className="font-medium">{row.tutor?.name}</p>
                          <p className="text-[10px] text-neutral-400">{row.tutor?.phone || '-'}</p>
                        </div>
                      ),
                    },
                    {
                      header: 'Pet',
                      render: (row: any) => (
                        <div>
                          <p className="font-medium">{row.pet?.name}</p>
                          <p className="text-[10px] text-neutral-400">{row.pet?.species} • {row.pet?.breed || 'S/R'}</p>
                        </div>
                      ),
                    },
                    { header: 'Responsável', accessor: 'assignedTo' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: FINANCEIRO (RF18) */}
          {/* ========================================================================= */}
          {activeTab === 'financial' && financialData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ReportSummaryCard
                  title="Faturamento Bruto"
                  value={fmtMoney(financialData.summary.totalGrossRevenue)}
                  subtitle={`${financialData.summary.completedServicesCount} serviços + ${financialData.summary.soldProductsCount} produtos`}
                  icon={DollarSign}
                />
                <ReportSummaryCard
                  title="Receita de Serviços"
                  value={fmtMoney(financialData.summary.grossRevenueServices)}
                  subtitle={`${financialData.summary.completedServicesCount} atendimentos concluídos`}
                  icon={ClipboardList}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-950/40"
                />
                <ReportSummaryCard
                  title="Receita de Produtos"
                  value={fmtMoney(financialData.summary.grossRevenueProducts)}
                  subtitle={`${financialData.summary.soldProductsCount} itens em ${financialData.summary.ordersCount} pedidos`}
                  icon={ShoppingBag}
                  iconColor="text-purple-600 dark:text-purple-400"
                  iconBg="bg-purple-100 dark:bg-purple-950/40"
                />
                <ReportSummaryCard
                  title="Faturamento Líquido"
                  value={fmtMoney(financialData.summary.netRevenue)}
                  subtitle="Sem taxas de gateway deduzidas"
                  icon={TrendingUp}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
              </div>

              {/* Payment Methods & Cash Flow Overview */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                    <CreditCard size={16} className="text-orange-500" />
                    Vendas de Produtos por Forma de Pagamento
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
                        <PaymentLogo method="pix" size="xs" /> Pix
                      </span>
                      <span className="text-xs font-bold">{fmtMoney(financialData.paymentMethodBreakdown.PIX)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
                        <PaymentLogo method="credito" size="xs" /> Cartão de Crédito
                      </span>
                      <span className="text-xs font-bold">{fmtMoney(financialData.paymentMethodBreakdown.CREDIT_CARD)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
                        <PaymentLogo method="debito" size="xs" /> Cartão de Débito
                      </span>
                      <span className="text-xs font-bold">{fmtMoney(financialData.paymentMethodBreakdown.DEBIT_CARD)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
                        <PaymentLogo method="dinheiro" size="xs" /> Dinheiro
                      </span>
                      <span className="text-xs font-bold">{fmtMoney(financialData.paymentMethodBreakdown.CASH)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-orange-500" />
                    Distribuição Temporal do Fluxo de Caixa
                  </h3>
                  {financialData.cashFlow.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nenhum faturamento registrado no período.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {financialData.cashFlow.map((cf: any) => (
                        <div key={cf.date} className="flex justify-between items-center text-xs border-b border-neutral-100 pb-1.5 dark:border-neutral-800">
                          <span className="font-medium text-neutral-600 dark:text-neutral-400">{cf.date}</span>
                          <div className="text-right">
                            <span className="font-bold text-neutral-900 dark:text-white">{fmtMoney(cf.total)}</span>
                            <span className="block text-[10px] text-neutral-400">({cf.count} transações)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Discriminação das Transações Concluídas
                </h3>
                <ReportTable
                  data={financialData.transactions}
                  columns={[
                    { header: 'Data', accessor: 'formattedDate' },
                    {
                      header: 'Tipo',
                      render: (row: any) => (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.type === 'SERVICO'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}>
                          {row.type}
                        </span>
                      ),
                    },
                    { header: 'Descrição / Item', accessor: 'description' },
                    { header: 'Cliente', accessor: 'clientName' },
                    { header: 'Forma Pagamento', accessor: 'paymentMethod' },
                    {
                      header: 'Valor',
                      render: (row: any) => (
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {fmtMoney(row.amount)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CLIENTES & PETS (RF19) */}
          {/* ========================================================================= */}
          {activeTab === 'customers' && customersData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportSummaryCard
                  title="Clientes Únicos"
                  value={customersData.summary.totalUniqueCustomers}
                  subtitle="Tutores atendidos ou com compras"
                  icon={Users}
                />
                <ReportSummaryCard
                  title="Pets Atendidos"
                  value={customersData.summary.totalUniquePets}
                  subtitle="Animais cadastrados com visitas"
                  icon={PawPrint}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Espécies Atendidas"
                  value={customersData.summary.speciesDistribution.length}
                  subtitle="Variedade de perfis veterinários"
                  icon={Sparkles}
                  iconColor="text-indigo-600 dark:text-indigo-400"
                  iconBg="bg-indigo-100 dark:bg-indigo-950/40"
                />
              </div>

              {/* Customers Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Histórico de Clientes / Tutores
                </h3>
                <ReportTable
                  data={customersData.customers}
                  columns={[
                    { header: 'Nome', accessor: 'name' },
                    { header: 'E-mail', accessor: 'email' },
                    { header: 'Telefone', accessor: 'phone' },
                    {
                      header: 'Pets Conhecidos',
                      render: (row: any) => (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {row.pets?.join(', ') || '-'}
                        </span>
                      ),
                    },
                    {
                      header: 'Interações',
                      render: (row: any) => (
                        <span className="text-xs font-semibold">
                          {row.totalAppointments} serviços / {row.totalOrders} pedidos
                        </span>
                      ),
                    },
                    { header: 'Última Visita', accessor: 'formattedLastVisit' },
                  ]}
                />
              </div>

              {/* Pets Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Histórico de Pets Atendidos
                </h3>
                <ReportTable
                  data={customersData.pets}
                  columns={[
                    { header: 'Nome do Pet', accessor: 'name' },
                    { header: 'Espécie', accessor: 'species' },
                    { header: 'Raça', accessor: 'breed' },
                    { header: 'Tutor', accessor: 'tutorName' },
                    { header: 'Total Atendimentos', accessor: 'totalAppointments' },
                    { header: 'Último Serviço', accessor: 'lastServiceName' },
                    { header: 'Data do Atendimento', accessor: 'formattedLastAppointment' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ESTOQUE (RF20) */}
          {/* ========================================================================= */}
          {activeTab === 'inventory' && inventoryData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ReportSummaryCard
                  title="Itens no Catálogo"
                  value={inventoryData.summary.totalProducts}
                  subtitle="Produtos cadastrados na loja"
                  icon={Package}
                />
                <ReportSummaryCard
                  title="Unidades em Estoque"
                  value={inventoryData.summary.totalStockUnits}
                  subtitle="Total físico disponível"
                  icon={CheckCircle2}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-950/40"
                />
                <ReportSummaryCard
                  title="Valor Patrimonial"
                  value={fmtMoney(inventoryData.summary.totalStockValue)}
                  subtitle="Estoque x Preço unitário"
                  icon={DollarSign}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Atenção Necessária"
                  value={inventoryData.summary.lowStockCount + inventoryData.summary.outOfStockCount}
                  subtitle={`${inventoryData.summary.lowStockCount} baixos, ${inventoryData.summary.outOfStockCount} esgotados`}
                  icon={AlertTriangle}
                  iconColor="text-rose-600 dark:text-rose-400"
                  iconBg="bg-rose-100 dark:bg-rose-950/40"
                />
              </div>

              {/* Products Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Posição Atual do Estoque e Volume de Vendas
                </h3>
                <ReportTable
                  data={inventoryData.products}
                  columns={[
                    {
                      header: 'Produto',
                      render: (row: any) => (
                        <div className="flex items-center gap-3">
                          {row.photo ? (
                            <img src={row.photo} alt={row.name} className="h-9 w-9 rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white">{row.name}</span>
                            <span className="block text-[11px] text-neutral-400">{row.category}</span>
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: 'Preço Unitário',
                      render: (row: any) => fmtMoney(row.price),
                    },
                    {
                      header: 'Qtd. Estoque',
                      render: (row: any) => (
                        <span className={`font-bold ${row.stock === 0 ? 'text-rose-600 dark:text-rose-400' : row.stock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          {row.stock} un.
                        </span>
                      ),
                    },
                    {
                      header: 'Volume Vendido',
                      render: (row: any) => (
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {row.salesVolume} un.
                        </span>
                      ),
                    },
                    {
                      header: 'Valor em Estoque',
                      render: (row: any) => (
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {fmtMoney(row.inventoryValue)}
                        </span>
                      ),
                    },
                    {
                      header: 'Situação',
                      render: (row: any) => {
                        if (row.stock === 0) {
                          return <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Esgotado</span>;
                        }
                        if (row.stock <= 5) {
                          return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Estoque Baixo</span>;
                        }
                        return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Normal</span>;
                      },
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Bottom Fiscal Notice (RF22) */}
          <FiscalNoticeCard contextName="estabelecimento" />
        </>
      )}
    </ReportLayout>
  );
};

export default EstablishmentReportsPage;
