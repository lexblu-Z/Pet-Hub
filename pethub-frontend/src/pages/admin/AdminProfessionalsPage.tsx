import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  FileText,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Input, Button, Badge, Modal, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedProf, setSelectedProf] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Suspension Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendPeriod, setSuspendPeriod] = useState('7d');
  const [customAmount, setCustomAmount] = useState('10');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('days');
  const [suspensionReason, setSuspensionReason] = useState('');

  const toast = useToast();

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/professionals');
      setProfessionals(res.data);
    } catch (err: any) {
      console.error('Error fetching professionals:', err);
      toast.error('Erro ao carregar profissionais do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.put(`/admin/professionals/${id}/status`, { status: 'ACTIVE' });
      toast.success('Profissional aprovado com sucesso!');

      setProfessionals(prev => prev.map(p => {
        if (p.id === id || p.professionalProfile?.id === id) {
          return {
            ...p,
            professionalProfile: {
              ...(p.professionalProfile || {}),
              status: 'ACTIVE',
              rejectionReason: null,
              suspendedUntil: null,
              suspensionReason: null,
            }
          };
        }
        return p;
      }));

      setSelectedProf(null);
      fetchProfessionals();
    } catch (err: any) {
      console.error('Approve error:', err);
      const msg = err.response?.data?.error || 'Erro ao aprovar profissional.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProf) return;
    if (!rejectionReason.trim()) {
      toast.error('A justificativa é obrigatória para reprovar.');
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = selectedProf.id;
      const reason = rejectionReason.trim();

      await api.put(`/admin/professionals/${targetId}/status`, {
        status: 'REJECTED',
        rejectionReason: reason,
      });

      setProfessionals(prev => prev.map(p => {
        if (p.id === targetId || p.professionalProfile?.id === targetId) {
          return {
            ...p,
            professionalProfile: {
              ...(p.professionalProfile || {}),
              status: 'REJECTED',
              rejectionReason: reason,
              suspendedUntil: null,
              suspensionReason: null,
            }
          };
        }
        return p;
      }));

      setRejectModalOpen(false);
      setSelectedProf(null);
      setRejectionReason('');
      toast.success('Profissional reprovado com sucesso.');

      fetchProfessionals();
    } catch (err: any) {
      console.error('Reject error:', err);
      const msg = err.response?.data?.error || 'Erro ao reprovar profissional.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateSuspendedUntil = () => {
    const now = Date.now();
    switch (suspendPeriod) {
      case '24h':
        return new Date(now + 24 * 3600 * 1000).toISOString();
      case '3d':
        return new Date(now + 3 * 24 * 3600 * 1000).toISOString();
      case '7d':
        return new Date(now + 7 * 24 * 3600 * 1000).toISOString();
      case '15d':
        return new Date(now + 15 * 24 * 3600 * 1000).toISOString();
      case '30d':
        return new Date(now + 30 * 24 * 3600 * 1000).toISOString();
      case '90d':
        return new Date(now + 90 * 24 * 3600 * 1000).toISOString();
      case 'custom': {
        const qty = Math.max(1, parseInt(customAmount, 10) || 1);
        const ms = customUnit === 'hours' ? qty * 3600 * 1000 : qty * 24 * 3600 * 1000;
        return new Date(now + ms).toISOString();
      }
      default:
        return new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    }
  };

  const handleConfirmSuspension = async () => {
    if (!selectedProf) return;
    if (!suspensionReason.trim()) {
      toast.error('O motivo da suspensão é obrigatório.');
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = selectedProf.id;
      const suspendedUntil = calculateSuspendedUntil();
      const reason = suspensionReason.trim();

      await api.put(`/admin/professionals/${targetId}/status`, {
        status: 'SUSPENDED',
        suspendedUntil,
        suspensionReason: reason,
      });

      setProfessionals(prev => prev.map(p => {
        if (p.id === targetId || p.professionalProfile?.id === targetId) {
          return {
            ...p,
            professionalProfile: {
              ...(p.professionalProfile || {}),
              status: 'SUSPENDED',
              suspendedUntil,
              suspensionReason: reason,
              suspendedAt: new Date().toISOString(),
            }
          };
        }
        return p;
      }));

      setSuspendModalOpen(false);
      setSelectedProf(null);
      setSuspensionReason('');
      toast.success('Profissional suspenso temporariamente.');

      fetchProfessionals();
    } catch (err: any) {
      console.error('Suspension error:', err);
      const msg = err.response?.data?.error || 'Erro ao suspender profissional.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.put(`/admin/professionals/${id}/status`, {
        status: 'ACTIVE',
      });

      setProfessionals(prev => prev.map(p => {
        if (p.id === id || p.professionalProfile?.id === id) {
          return {
            ...p,
            professionalProfile: {
              ...(p.professionalProfile || {}),
              status: 'ACTIVE',
              suspendedUntil: null,
              suspensionReason: null,
              suspendedAt: null,
            }
          };
        }
        return p;
      }));

      setSelectedProf(null);
      toast.success('Conta do profissional reativada com sucesso!');
      fetchProfessionals();
    } catch (err: any) {
      console.error('Reactivate error:', err);
      toast.error('Erro ao reativar conta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = professionals.filter((p) => {
    const q = search.toLowerCase().trim();
    const nameMatch = !q || p.name.toLowerCase().includes(q);
    const emailMatch = !q || p.email.toLowerCase().includes(q);
    const specMatch = !q || (p.professionalProfile?.specialty || '').toLowerCase().includes(q);
    const docMatch = !q || (p.professionalProfile?.document || '').toLowerCase().includes(q);
    
    const matchesSearch = nameMatch || emailMatch || specMatch || docMatch;
    const status = p.professionalProfile?.status || 'PENDING_APPROVAL';
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">✓ Ativo</Badge>;
      case 'SUSPENDED':
        return <Badge variant="warning">⏸️ Suspenso</Badge>;
      case 'REJECTED':
        return <Badge variant="error">✕ Reprovado</Badge>;
      case 'PENDING_APPROVAL':
      default:
        return <Badge variant="default">⏳ Pendente</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Profissionais da Plataforma</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Gerencie médicos veterinários, especialistas e prestadores autônomos</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-neutral-700">
            Total: {professionals.length} profissionais
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            Pendentes: {professionals.filter(p => p.professionalProfile?.status === 'PENDING_APPROVAL').length}
          </span>
          <span className="px-3 py-1.5 bg-green-50 text-green-800 rounded-xl border border-green-200">
            Ativos: {professionals.filter(p => p.professionalProfile?.status === 'ACTIVE').length}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por nome, CRMV, especialidade ou e-mail..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING_APPROVAL', label: 'Pendentes ⏳' },
            { id: 'ACTIVE', label: 'Ativos ✓' },
            { id: 'SUSPENDED', label: 'Suspensos ⏸️' },
            { id: 'REJECTED', label: 'Reprovados ✕' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando profissionais...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Stethoscope size={40} className="mx-auto opacity-30 text-neutral-500" />
            <p className="font-bold text-neutral-700">Nenhum profissional encontrado</p>
            <p className="text-xs text-neutral-400">Tente ajustar a busca ou o filtro de status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-neutral-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Profissional</th>
                  <th className="py-3.5 px-4">Especialidade / Documento</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((prof) => {
                  const status = prof.professionalProfile?.status || 'PENDING_APPROVAL';
                  return (
                    <tr key={prof.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={prof.avatar} name={prof.name} size="sm" entityType="professional" />
                          <div>
                            <div className="font-bold text-neutral-900">{prof.name}</div>
                            <div className="text-xs text-neutral-400">{prof.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-neutral-800 text-xs">
                          {prof.professionalProfile?.specialty || 'Veterinário / Cuidador'}
                        </div>
                        <div className="text-xs text-teal-600 font-mono font-medium">
                          {prof.professionalProfile?.document || 'Documento pendente'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-600 text-xs">
                        {prof.phone || 'Sem telefone'}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(status)}
                      </td>
                      <td className="py-4 px-4 text-neutral-500 text-xs">
                        {new Date(prof.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedProf(prof)}
                            className="text-neutral-600 hover:text-neutral-900"
                            title="Ver detalhes completos"
                          >
                            <Eye size={15} className="mr-1" /> Detalhes
                          </Button>

                          {status === 'PENDING_APPROVAL' && (
                            <>
                              <Button
                                size="xs"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(prof.id)}
                                isLoading={isProcessing}
                                title="Aprovar profissional"
                              >
                                <CheckCircle size={14} className="mr-1" /> Aprovar
                              </Button>
                              <Button
                                size="xs"
                                variant="danger"
                                onClick={() => {
                                  setSelectedProf(prof);
                                  setRejectModalOpen(true);
                                }}
                                isLoading={isProcessing}
                                title="Reprovar profissional"
                              >
                                <XCircle size={14} className="mr-1" /> Reprovar
                              </Button>
                            </>
                          )}

                          {status === 'ACTIVE' && (
                            <Button
                              size="xs"
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => {
                                setSelectedProf(prof);
                                setSuspendModalOpen(true);
                              }}
                              title="Suspender temporariamente"
                            >
                              <PauseCircle size={14} className="mr-1" /> Suspender
                            </Button>
                          )}

                          {status === 'SUSPENDED' && (
                            <Button
                              size="xs"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleReactivate(prof.id)}
                              isLoading={isProcessing}
                              title="Reativar conta"
                            >
                              <PlayCircle size={14} className="mr-1" /> Reativar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedProf && !rejectModalOpen && !suspendModalOpen && (
        <Modal
          isOpen={!!selectedProf}
          onClose={() => setSelectedProf(null)}
          title="Detalhes do Profissional"
          size="md"
        >
          <div className="space-y-4 text-sm">
            {/* Top Identity Header */}
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <Avatar src={selectedProf.avatar} name={selectedProf.name} size="lg" entityType="professional" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-base text-neutral-900 truncate">{selectedProf.name}</p>
                  {getStatusBadge(selectedProf.professionalProfile?.status)}
                </div>
                <p className="text-xs font-semibold text-teal-600 mt-0.5">
                  {selectedProf.professionalProfile?.specialty || 'Profissional da Saúde Animal'}
                </p>
                <p className="text-xs text-neutral-400 font-mono">
                  {selectedProf.professionalProfile?.document || 'Documento não informado'}
                </p>
              </div>
            </div>

            {/* If Suspended: Show Alert Box */}
            {selectedProf.professionalProfile?.status === 'SUSPENDED' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle size={15} className="text-amber-600" />
                  Conta suspensa temporariamente
                </p>
                <p><span className="font-semibold">Motivo:</span> {selectedProf.professionalProfile.suspensionReason || 'Violação das diretrizes da plataforma.'}</p>
                {selectedProf.professionalProfile.suspendedUntil && (
                  <p><span className="font-semibold">Término previsto:</span> {new Date(selectedProf.professionalProfile.suspendedUntil).toLocaleString('pt-BR')}</p>
                )}
              </div>
            )}

            {/* If Rejected: Show Rejection Notice */}
            {selectedProf.professionalProfile?.status === 'REJECTED' && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-950">
                  <XCircle size={15} className="text-red-600" />
                  Cadastro Reprovado
                </p>
                <p><span className="font-semibold">Motivo:</span> {selectedProf.professionalProfile.rejectionReason || 'Não informado.'}</p>
              </div>
            )}

            {/* Contact & Bio Info */}
            <div className="space-y-2 border border-neutral-100 rounded-xl p-3 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">E-mail:</span>
                <span className="font-medium text-neutral-900">{selectedProf.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Telefone:</span>
                <span className="font-medium text-neutral-900">{selectedProf.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Cadastrado em:</span>
                <span className="font-medium text-neutral-900">{new Date(selectedProf.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-2">
                <span className="text-neutral-500 block mb-1 font-semibold">Biografia / Descrição:</span>
                <p className="text-neutral-700 bg-neutral-50 p-2.5 rounded-lg leading-relaxed">
                  {selectedProf.professionalProfile?.bio || 'Nenhuma biografia informada no cadastro.'}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setSelectedProf(null)}>
                Fechar
              </Button>

              {selectedProf.professionalProfile?.status === 'PENDING_APPROVAL' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setRejectModalOpen(true)}
                  >
                    <XCircle size={16} className="mr-1.5" /> Reprovar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(selectedProf.id)}
                    isLoading={isProcessing}
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Aprovar Profissional
                  </Button>
                </>
              )}

              {selectedProf.professionalProfile?.status === 'ACTIVE' && (
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setSuspendModalOpen(true)}
                >
                  <PauseCircle size={16} className="mr-1.5" /> Suspender temporariamente
                </Button>
              )}

              {selectedProf.professionalProfile?.status === 'SUSPENDED' && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleReactivate(selectedProf.id)}
                  isLoading={isProcessing}
                >
                  <PlayCircle size={16} className="mr-1.5" /> Reativar Conta Imediatamente
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Rejection */}
      {rejectModalOpen && selectedProf && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reprovar profissional?"
          size="md"
        >
          <div className="space-y-4 text-sm">
            <p className="text-neutral-600 text-xs">
              Informe o motivo da reprovação de <span className="font-bold text-neutral-900">{selectedProf.name}</span>. Essa informação ficará registrada no banco.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Motivo da reprovação <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Documento CRMV não localizado no conselho de classe..."
                rows={3}
                className="w-full border border-neutral-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => setRejectModalOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                isLoading={isProcessing}
              >
                Confirmar reprovação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Suspension */}
      {suspendModalOpen && selectedProf && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title="Suspender conta temporariamente?"
          size="md"
        >
          <div className="space-y-5 text-sm">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">Impacto da suspensão do profissional:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>O profissional perderá temporariamente acesso à agenda e novos atendimentos.</li>
                <li>A reativação ocorrerá <strong>automaticamente</strong> após o término do período definido.</li>
              </ul>
            </div>

            {/* Predefined Periods */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">
                Duração da Suspensão
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '24h', label: '24 horas' },
                  { id: '3d', label: '3 dias' },
                  { id: '7d', label: '7 dias' },
                  { id: '15d', label: '15 dias' },
                  { id: '30d', label: '30 dias' },
                  { id: '90d', label: '90 dias' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSuspendPeriod(p.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      suspendPeriod === p.id
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Period Option */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setSuspendPeriod('custom')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-all ${
                    suspendPeriod === 'custom'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span>✏️ Outro período personalizado</span>
                  {suspendPeriod === 'custom' && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">Selecionado</span>}
                </button>

                {suspendPeriod === 'custom' && (
                  <div className="mt-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Unidade</label>
                      <select
                        value={customUnit}
                        onChange={(e: any) => setCustomUnit(e.target.value)}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="hours">Horas</option>
                        <option value="days">Dias</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Suspension Reason */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Motivo da suspensão <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Ex: Denúncia em análise de conduta ética ou documento suspenso pelo CRMV..."
                rows={3}
                className="w-full border border-neutral-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => setSuspendModalOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmSuspension}
                isLoading={isProcessing}
              >
                Confirmar suspensão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
