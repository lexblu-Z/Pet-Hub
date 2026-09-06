import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import {
  ClipboardList,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  DollarSign,
  Info,
  Calendar,
  Sparkles,
  PawPrint,
  Building2,
} from 'lucide-react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import type { ReportTab } from '@/components/reports/ReportLayout';
import { ReportFilters, DATE_PRESETS } from '@/components/reports/ReportFilters';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { ReportTable } from '@/components/reports/ReportTable';
import { FiscalNoticeCard } from '@/components/reports/FiscalNoticeCard';

const TABS: ReportTab[] = [
  { id: 'services', label: 'Meus Serviços', icon: ClipboardList },
  { id: 'financial', label: 'Meu Financeiro', icon: TrendingUp },
  { id: 'customers', label: 'Meus Clientes & Pets', icon: Users },
];

const STATUS_OPTIONS = [
  { label: 'Concluído', value: 'COMPLETED' },
  { label: 'Em Andamento', value: 'IN_PROGRESS' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

export const ProfessionalReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('services');

  // Default dates: last 30 days
  const defaultDates = DATE_PRESETS[3].getDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  // Filters
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [species, setSpecies] = useState<string>('');

  // Data states
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [servicesData, setServicesData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);

  // Categories list
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Fetch report data for active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'services') {
        const res = await api.get('/reports/professional/services', {
          params: {
            startDate,
            endDate,
            status: status || undefined,
            serviceType: category || undefined,
          },
        });
        setServicesData(res.data);

        if (res.data?.servicesByCategory) {
          setCategoriesList(res.data.servicesByCategory.map((c: any) => c.category));
        }
      } else if (activeTab === 'financial') {
        const res = await api.get('/reports/professional/financial', {
          params: {
            startDate,
            endDate,
          },
        });
        setFinancialData(res.data);
      } else if (activeTab === 'customers') {
        const res = await api.get('/reports/professional/customers', {
          params: {
            startDate,
            endDate,
            species: species || undefined,
          },
        });
        setCustomersData(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório do profissional:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, status, category, species]);

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
    setSpecies('');
  };

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/reports/professional/export', {
        params: {
          type: activeTab,
          startDate,
          endDate,
          status: status || undefined,
          serviceType: category || undefined,
          species: species || undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-profissional-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar CSV do profissional:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Format currency
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
      title="Meus Relatórios"
      subtitle="Acompanhe sua produtividade, atendimentos realizados, clientes e faturamento bruto dos seus serviços."
      badge="Atuação Profissional"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onExportCsv={handleExportCsv}
      isExporting={isExporting}
    >
      {/* Filters (No Professional selector since user is the professional) */}
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
        category={activeTab === 'services' ? category : undefined}
        onCategoryChange={activeTab === 'services' ? setCategory : undefined}
        categories={categoriesList}
        species={activeTab === 'customers' ? species : undefined}
        onSpeciesChange={activeTab === 'customers' ? setSpecies : undefined}
        onReset={handleResetFilters}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent"></div>
            <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Carregando dados dos seus atendimentos...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: MEUS SERVIÇOS (RF17 ADAPTADO) */}
          {/* ========================================================================= */}
          {activeTab === 'services' && servicesData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <ReportSummaryCard
                  title="Meus Atendimentos"
                  value={servicesData.summary.total}
                  subtitle="No período selecionado"
                  icon={Calendar}
                />
                <ReportSummaryCard
                  title="Concluídos"
                  value={servicesData.summary.completed}
                  subtitle="Serviços finalizados"
                  icon={CheckCircle2}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Em Andamento"
                  value={servicesData.summary.inProgress + servicesData.summary.confirmed}
                  subtitle="Agendados ou em execução"
                  icon={Clock}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-950/40"
                />
                <ReportSummaryCard
                  title="Cancelados"
                  value={servicesData.summary.cancelled}
                  subtitle="Cancelamentos registrados"
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

              {/* Service Categories Breakdown */}
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-orange-500" />
                  Distribuição por Categoria de Serviço
                </h3>
                {servicesData.servicesByCategory.length === 0 ? (
                  <p className="text-xs text-neutral-500">Nenhum atendimento realizado no período.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servicesData.servicesByCategory.map((c: any) => (
                      <div key={c.category} className="rounded-xl border border-neutral-100 p-3.5 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{c.category}</span>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{c.count} atendimentos</span>
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          {c.completed} concluídos com sucesso
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detailed Appointments Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Histórico de Atendimentos Pessoais
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
                      header: 'Local / Estabelecimento',
                      render: (row: any) => (
                        <span className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                          <Building2 size={12} className="text-neutral-400" />
                          {row.establishmentName}
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
                    {
                      header: 'Valor Bruto',
                      render: (row: any) => (
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {fmtMoney(row.service?.price)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MEU FINANCEIRO (RF18 ADAPTADO) */}
          {/* ========================================================================= */}
          {activeTab === 'financial' && financialData && (
            <div className="space-y-6">
              {/* Transparency Notice Regarding Commissions */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <Info size={18} />
                  </div>
                  <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <p className="font-semibold">Transparência Financeira:</p>
                    <p className="mt-0.5">{financialData.summary.commissionNotice}</p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportSummaryCard
                  title="Faturamento Bruto de Serviços"
                  value={fmtMoney(financialData.summary.grossRevenue)}
                  subtitle="Soma de todos os seus serviços concluídos"
                  icon={DollarSign}
                />
                <ReportSummaryCard
                  title="Atendimentos Concluídos"
                  value={financialData.summary.completedServicesCount}
                  subtitle="Serviços faturados no período"
                  icon={CheckCircle2}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Ticket Médio"
                  value={fmtMoney(financialData.summary.averageTicket)}
                  subtitle="Média por atendimento realizado"
                  icon={TrendingUp}
                  iconColor="text-indigo-600 dark:text-indigo-400"
                  iconBg="bg-indigo-100 dark:bg-indigo-950/40"
                />
              </div>

              {/* Completed Services Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Serviços Concluídos Faturados
                </h3>
                <ReportTable
                  data={financialData.transactions}
                  columns={[
                    { header: 'Data', accessor: 'formattedDate' },
                    { header: 'Serviço Realizado', accessor: 'serviceName' },
                    { header: 'Cliente / Tutor', accessor: 'clientName' },
                    { header: 'Pet', accessor: 'petName' },
                    {
                      header: 'Valor Bruto',
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
          {/* TAB 3: CLIENTES & PETS DO PROFISSIONAL (RF19 ADAPTADO) */}
          {/* ========================================================================= */}
          {activeTab === 'customers' && customersData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportSummaryCard
                  title="Clientes Atendidos por Mim"
                  value={customersData.summary.totalUniqueCustomers}
                  subtitle="Tutores que já passaram pelo seu atendimento"
                  icon={Users}
                />
                <ReportSummaryCard
                  title="Pets Atendidos"
                  value={customersData.summary.totalUniquePets}
                  subtitle="Animais que você já cuidou"
                  icon={PawPrint}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                />
                <ReportSummaryCard
                  title="Espécies Atendidas"
                  value={customersData.summary.speciesDistribution.length}
                  subtitle="Tipos de animais atendidos"
                  icon={Sparkles}
                  iconColor="text-indigo-600 dark:text-indigo-400"
                  iconBg="bg-indigo-100 dark:bg-indigo-950/40"
                />
              </div>

              {/* Customers Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Tutores com Atendimento Pessoal
                </h3>
                <ReportTable
                  data={customersData.customers}
                  columns={[
                    { header: 'Nome', accessor: 'name' },
                    { header: 'E-mail', accessor: 'email' },
                    { header: 'Telefone', accessor: 'phone' },
                    {
                      header: 'Pets Atendidos por Você',
                      render: (row: any) => (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {row.pets?.join(', ') || '-'}
                        </span>
                      ),
                    },
                    {
                      header: 'Total Atendimentos Seus',
                      render: (row: any) => (
                        <span className="text-xs font-semibold">
                          {row.totalAppointments} atendimentos
                        </span>
                      ),
                    },
                    { header: 'Último Atendimento', accessor: 'formattedLastVisit' },
                  ]}
                />
              </div>

              {/* Pets Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Pets Atendidos Diretamente por Você
                </h3>
                <ReportTable
                  data={customersData.pets}
                  columns={[
                    { header: 'Nome do Pet', accessor: 'name' },
                    { header: 'Espécie', accessor: 'species' },
                    { header: 'Raça', accessor: 'breed' },
                    { header: 'Tutor', accessor: 'tutorName' },
                    { header: 'Atendimentos por Você', accessor: 'totalAppointments' },
                    { header: 'Último Serviço Realizado', accessor: 'lastServiceName' },
                    { header: 'Data do Atendimento', accessor: 'formattedLastAppointment' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Bottom Fiscal Notice (RF22) */}
          <FiscalNoticeCard contextName="profissional" />
        </>
      )}
    </ReportLayout>
  );
};

export default ProfessionalReportsPage;
