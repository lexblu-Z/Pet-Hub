import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  FileDown,
  Download,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  User,
  Building2,
  FileText,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToastStore } from '@/store/toastStore';

export default function AdminModerationPage() {
  const { addToast } = useToastStore();
  const [reports, setReports] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ ALL: 0, NOVA: 0, EM_ANALISE: 0, RESOLVIDA: 0, ARQUIVADA: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/reports?${params.toString()}`);
      setReports(res.data.reports || []);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || { ALL: 0, NOVA: 0, EM_ANALISE: 0, RESOLVIDA: 0, ARQUIVADA: 0 });
    } catch (err) {
      console.error('Error fetching moderation reports', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleUpdateStatus = async (newStatus: 'EM_ANALISE' | 'RESOLVIDA' | 'ARQUIVADA') => {
    if ((newStatus === 'RESOLVIDA' || newStatus === 'ARQUIVADA') && !decisionReason.trim()) {
      addToast({
        type: 'error',
        title: 'Parecer obrigatório',
        message: 'Por favor, registre o motivo da decisão tomada.',
      });
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await api.put(`/admin/reports/${selectedReport.id}/status`, {
        status: newStatus,
        decisionReason: decisionReason.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Denúncia atualizada',
        message: `Status alterado para ${newStatus}.`,
      });

      setSelectedReport(null);
      setDecisionReason('');
      setAdminNotes('');
      fetchReports();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: err.response?.data?.error || 'Não foi possível atualizar a denúncia.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const res = await api.get(`/admin/export?type=moderation&format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pethub_moderacao_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert size={24} className="text-orange-500" />
            <span>Fila Administrativa de Moderação</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Análise e resolução de denúncias de conduta, perfis e avaliações
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

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'NOVA', 'EM_ANALISE', 'RESOLVIDA', 'ARQUIVADA'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-[#131314] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {st === 'ALL'
                ? `Todas (${counts.ALL || 0})`
                : st === 'NOVA'
                ? `Novas (${counts.NOVA || 0})`
                : st === 'EM_ANALISE'
                ? `Em Análise (${counts.EM_ANALISE || 0})`
                : st === 'RESOLVIDA'
                ? `Resolvidas (${counts.RESOLVIDA || 0})`
                : `Arquivadas (${counts.ARQUIVADA || 0})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por motivo, usuário..."
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

      {/* Complaints Table */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Nº</th>
                <th className="px-5 py-3">Denunciante</th>
                <th className="px-5 py-3">Denunciado</th>
                <th className="px-5 py-3">Tipo / Motivo</th>
                <th className="px-5 py-3">Prioridade</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-400 text-xs">
                    Carregando fila de moderação...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-400 text-xs">
                    Nenhuma denúncia encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="px-5 py-3.5 font-bold text-xs text-neutral-900 dark:text-white">
                      #{r.reportNumber}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {r.reporter?.name || 'Usuário'}
                      </span>
                      <span className="text-neutral-400 text-[11px]">{r.reporter?.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {r.reportedEstablishment?.businessName || r.reportedUser?.name || 'Perfil'}
                      </span>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                        {r.targetType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                        {r.reason}
                      </span>
                      <span className="text-neutral-400 text-[11px] truncate max-w-xs block">
                        {r.description}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.priority === 'URGENTE'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : r.priority === 'ALTA'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'NOVA'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : r.status === 'EM_ANALISE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : r.status === 'RESOLVIDA'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(r);
                          setDecisionReason(r.decisionReason || '');
                          setAdminNotes(r.adminNotes || '');
                        }}
                        className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye size={13} /> Analisar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between text-xs text-neutral-500">
          <span>
            Exibindo {reports.length} de {total} denúncia(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-[#313335] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-semibold text-neutral-900 dark:text-white">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={reports.length < 15}
              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-[#313335] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Moderation Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-neutral-200 dark:border-[#313335] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#313335]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Denúncia #{selectedReport.reportNumber}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Aberta em {new Date(selectedReport.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Target & Reporter Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Denunciante</span>
                  <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-1">
                    {selectedReport.reporter?.name}
                  </p>
                  <p className="text-neutral-500 text-[11px]">{selectedReport.reporter?.email}</p>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Alvo Denunciado</span>
                  <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-1">
                    {selectedReport.reportedEstablishment?.businessName || selectedReport.reportedUser?.name || 'Perfil'}
                  </p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">{selectedReport.targetType}</p>
                </div>
              </div>

              {/* Reason & Description */}
              <div className="p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-1.5">
                <span className="text-[10px] uppercase text-neutral-400 font-bold">Motivo Declarado</span>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{selectedReport.reason}</p>
                <div className="pt-2 border-t border-neutral-200 dark:border-[#313335]">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold">Descrição dos Fatos</span>
                  <p className="text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>
              </div>

              {/* Historical Decision (if already resolved/archived) */}
              {selectedReport.decisionReason && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 text-emerald-800 dark:text-emerald-300">
                  <span className="text-[10px] uppercase font-bold">Parecer da Moderação</span>
                  <p className="text-xs">{selectedReport.decisionReason}</p>
                  {selectedReport.resolvedBy && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1">
                      Resolvido por {selectedReport.resolvedBy.name} em {new Date(selectedReport.resolvedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              {/* Admin Decision Form */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                    Motivo da Decisão / Parecer Administrativo
                  </label>
                  <textarea
                    rows={3}
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Registrar justificativa oficial da decisão (obrigatório para resolver ou arquivar)..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                    Notas Administrativas Internas
                  </label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Observações visíveis apenas para outros administradores..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-neutral-50 dark:bg-[#131314] border-t border-neutral-200 dark:border-[#313335] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={isUpdatingStatus}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                {selectedReport.status === 'NOVA' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('EM_ANALISE')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Iniciar Análise
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('ARQUIVADA')}
                  disabled={isUpdatingStatus}
                  className="px-3.5 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Arquivar
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('RESOLVIDA')}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Resolver Denúncia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
