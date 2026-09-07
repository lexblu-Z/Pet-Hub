import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
  Calendar,
} from 'lucide-react';
import { api } from '@/services/api';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (actionFilter.trim()) params.append('action', actionFilter.trim());
      if (entityFilter.trim()) params.append('entity', entityFilter.trim());

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
          <FileText size={24} className="text-orange-500" />
          <span>Trilha de Auditoria Administrativa</span>
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Registro imutável de todas as ações sensíveis realizadas por administradores
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white"
          >
            <option value="">Todas as Ações</option>
            <option value="ESTABLISHMENT">Estabelecimentos</option>
            <option value="PROFESSIONAL">Profissionais</option>
            <option value="REPORT">Moderação</option>
            <option value="NOTIFICATION">Notificações</option>
            <option value="DELETE">Exclusões</option>
          </select>
        </div>

        <span className="text-xs text-neutral-400">{total} registro(s) no histórico</span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Data / Hora</th>
                <th className="px-5 py-3">Administrador</th>
                <th className="px-5 py-3">Ação</th>
                <th className="px-5 py-3">Entidade</th>
                <th className="px-5 py-3">Detalhes</th>
                <th className="px-5 py-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-400 text-xs">
                    Carregando trilha de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-400 text-xs">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {log.admin?.name || 'Admin'}
                      </span>
                      <span className="text-neutral-400 text-[11px]">{log.admin?.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#131314] font-semibold text-[10px] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-[#313335]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">
                      {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-500 max-w-sm truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-right text-neutral-400 font-mono">
                      {log.ipAddress || '127.0.0.1'}
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
            Exibindo {logs.length} de {total} registro(s)
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
              disabled={logs.length < 20}
              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-[#313335] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
