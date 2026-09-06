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
  MapPin,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { Input, Button, Badge, Modal, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedProf, setSelectedProf] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Profissionais da Plataforma</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">Gerencie médicos veterinários, especialistas e prestadores autônomos</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 dark:bg-[#282A2C] rounded-xl text-neutral-700 dark:text-[#C4C7C5] border border-neutral-200/50 dark:border-[#313335]">
            Total: {professionals.length} profissionais
          </span>
          <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800/50">
            Pendentes: {professionals.filter(p => p.professionalProfile?.status === 'PENDING_APPROVAL').length}
          </span>
          <span className="px-3 py-1.5 bg-green-50 dark:bg-emerald-950/40 text-green-800 dark:text-emerald-300 rounded-xl border border-green-200 dark:border-emerald-800/50">
            Ativos: {professionals.filter(p => p.professionalProfile?.status === 'ACTIVE').length}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
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
                  ? 'bg-neutral-900 dark:bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-200 dark:hover:bg-[#313335]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F]">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando profissionais...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F] space-y-2">
            <Stethoscope size={40} className="mx-auto opacity-30 text-neutral-500 dark:text-neutral-600" />
            <p className="font-bold text-neutral-700 dark:text-[#E3E3E3]">Nenhum profissional encontrado</p>
            <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Tente ajustar a busca ou o filtro de status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-[#282A2C] text-neutral-400 dark:text-[#8E918F] text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Profissional</th>
                  <th className="py-3.5 px-4">Especialidade / Documento</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
                {filtered.map((prof) => {
                  const status = prof.professionalProfile?.status || 'PENDING_APPROVAL';
                  return (
                    <tr key={prof.id} className="hover:bg-neutral-50/60 dark:hover:bg-[#282A2C]/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={prof.avatar} name={prof.name} size="sm" entityType="professional" />
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{prof.name}</div>
                            <div className="text-xs text-neutral-400 dark:text-[#8E918F]">{prof.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-neutral-800 dark:text-[#C4C7C5] text-xs">
                          {prof.professionalProfile?.specialty || 'Veterinário / Cuidador'}
                        </div>
                        <div className="text-xs text-teal-600 dark:text-teal-400 font-mono font-medium">
                          {prof.professionalProfile?.document || 'Documento pendente'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-600 dark:text-[#C4C7C5] text-xs">
                        {prof.phone || 'Sem telefone'}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(status)}
                      </td>
                      <td className="py-4 px-4 text-neutral-500 dark:text-[#8E918F] text-xs">
                        {new Date(prof.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedProf(prof)}
                            className="text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white"
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
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335]">
              <Avatar src={selectedProf.avatar} name={selectedProf.name} size="lg" entityType="professional" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3] truncate">{selectedProf.name}</p>
                  {getStatusBadge(selectedProf.professionalProfile?.status)}
                </div>
                <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                  {selectedProf.professionalProfile?.specialty || 'Profissional da Saúde Animal'}
                </p>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F] font-mono">
                  {selectedProf.professionalProfile?.document || 'Documento não informado'}
                </p>
              </div>
            </div>

            {/* If Suspended: Show Alert Box */}
            {selectedProf.professionalProfile?.status === 'SUSPENDED' && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-300">
                  <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
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
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-900 dark:text-red-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-950 dark:text-red-300">
                  <XCircle size={15} className="text-red-600 dark:text-red-400" />
                  Cadastro Reprovado
                </p>
                <p><span className="font-semibold">Motivo:</span> {selectedProf.professionalProfile.rejectionReason || 'Não informado.'}</p>
              </div>
            )}

            {/* Workplace Photo & Address Section */}
            <div className="space-y-3">
              {/* Foto do Local */}
              <div className="p-3.5 bg-white dark:bg-[#1E1F20] border border-neutral-200/80 dark:border-[#313335] rounded-2xl space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-[#313335]">
                  <div className="flex items-center gap-2 text-neutral-900 dark:text-[#E3E3E3] font-bold text-xs">
                    <Camera size={14} className="text-orange-500" />
                    <span>Foto do Local de Atendimento</span>
                  </div>
                  {selectedProf.professionalProfile?.workplacePhoto ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-md">
                      Disponível
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md">
                      Pendente
                    </span>
                  )}
                </div>

                {selectedProf.professionalProfile?.workplacePhoto ? (
                  <div
                    onClick={() => setPreviewPhoto(getFullImageUrl(selectedProf.professionalProfile.workplacePhoto))}
                    className="group relative rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] aspect-video bg-neutral-100 dark:bg-[#282A2C] cursor-pointer shadow-xs hover:border-orange-400 transition-all"
                  >
                    <img
                      src={getFullImageUrl(selectedProf.professionalProfile.workplacePhoto)}
                      alt="Local de atendimento"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <ExternalLink size={14} /> Ampliar foto
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-neutral-50 dark:bg-[#282A2C] rounded-xl border border-dashed border-neutral-200 dark:border-[#313335]">
                    <Camera size={20} className="mx-auto text-neutral-400 mb-1" />
                    <p className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5]">Foto do local não informada</p>
                    <p className="text-[10px] text-neutral-400 dark:text-[#8E918F] mt-0.5">Profissional cadastrado anteriormente ou sem foto enviada.</p>
                  </div>
                )}
              </div>

              {/* Endereço de Atendimento */}
              <div className="p-3.5 bg-white dark:bg-[#1E1F20] border border-neutral-200/80 dark:border-[#313335] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-100 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] font-bold text-xs">
                  <MapPin size={14} className="text-orange-500" />
                  <span>Endereço do Atendimento</span>
                </div>

                {selectedProf.professionalProfile?.address || selectedProf.professionalProfile?.city ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 dark:text-[#8E918F] block font-medium">Logradouro / Número:</span>
                      <span className="text-neutral-800 dark:text-[#C4C7C5] font-semibold">
                        {selectedProf.professionalProfile?.address || 'Não informado'} {selectedProf.professionalProfile?.number ? `, nº ${selectedProf.professionalProfile.number}` : ''}
                      </span>
                    </div>
                    {selectedProf.professionalProfile?.complement && (
                      <div>
                        <span className="text-neutral-400 dark:text-[#8E918F] block font-medium">Complemento:</span>
                        <span className="text-neutral-800 dark:text-[#C4C7C5] font-semibold">
                          {selectedProf.professionalProfile.complement}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-neutral-400 dark:text-[#8E918F] block font-medium">Bairro:</span>
                      <span className="text-neutral-800 dark:text-[#C4C7C5] font-semibold">
                        {selectedProf.professionalProfile?.neighborhood || 'Não informado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 dark:text-[#8E918F] block font-medium">Cidade / UF:</span>
                      <span className="text-neutral-800 dark:text-[#C4C7C5] font-semibold">
                        {selectedProf.professionalProfile?.city || 'Ourinhos'} - {selectedProf.professionalProfile?.state || 'SP'}
                      </span>
                    </div>
                    {selectedProf.professionalProfile?.zipCode && (
                      <div>
                        <span className="text-neutral-400 dark:text-[#8E918F] block font-medium">CEP:</span>
                        <span className="text-neutral-800 dark:text-[#C4C7C5] font-mono font-semibold">
                          {selectedProf.professionalProfile.zipCode}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-[#8E918F] py-1">
                    Nenhum endereço físico registrado para este profissional.
                  </p>
                )}
              </div>
            </div>

            {/* Contact & Bio Info */}
            <div className="space-y-2 border border-neutral-100 dark:border-[#313335] rounded-xl p-3 text-xs bg-white dark:bg-[#1E1F20]">
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F]">E-mail:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3]">{selectedProf.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F]">Telefone:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3]">{selectedProf.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F]">Cadastrado em:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3]">{new Date(selectedProf.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-2">
                <span className="text-neutral-500 dark:text-[#8E918F] block mb-1 font-semibold">Biografia / Descrição:</span>
                <p className="text-neutral-700 dark:text-[#C4C7C5] bg-neutral-50 dark:bg-[#282A2C] p-2.5 rounded-lg leading-relaxed border border-transparent dark:border-[#313335]">
                  {selectedProf.professionalProfile?.bio || 'Nenhuma biografia informada no cadastro.'}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100 dark:border-[#313335]">
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
            <p className="text-neutral-600 dark:text-[#C4C7C5] text-xs">
              Informe o motivo da reprovação de <span className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{selectedProf.name}</span>. Essa informação ficará registrada no banco.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                Motivo da reprovação <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Documento CRMV não localizado no conselho de classe..."
                rows={3}
                className="w-full border border-neutral-300 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-[#313335]">
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
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-bold mb-1">Impacto da suspensão do profissional:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
                <li>O profissional perderá temporariamente acesso à agenda e novos atendimentos.</li>
                <li>A reativação ocorrerá <strong>automaticamente</strong> após o término do período definido.</li>
              </ul>
            </div>

            {/* Predefined Periods */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-2">
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
                        : 'bg-white dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:bg-neutral-50 dark:hover:bg-[#313335]'
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
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-200 dark:ring-amber-900'
                      : 'bg-white dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-50 dark:hover:bg-[#313335]'
                  }`}
                >
                  <span>✏️ Outro período personalizado</span>
                  {suspendPeriod === 'custom' && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">Selecionado</span>}
                </button>

                {suspendPeriod === 'custom' && (
                  <div className="mt-2.5 p-3 bg-neutral-50 dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335] flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-[#8E918F] mb-1">Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-[#313335] rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-[#8E918F] mb-1">Unidade</label>
                      <select
                        value={customUnit}
                        onChange={(e: any) => setCustomUnit(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-[#313335] rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                Motivo da suspensão <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Ex: Denúncia em análise de conduta ética ou documento suspenso pelo CRMV..."
                rows={3}
                className="w-full border border-neutral-300 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-[#313335]">
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

      {/* Modal: Preview Photo */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title="Foto Ampliada do Local de Atendimento"
          size="lg"
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={previewPhoto}
              alt="Visualização ampliada do local"
              className="max-h-[70vh] w-auto rounded-2xl object-contain border border-neutral-200 dark:border-[#313335]"
            />
            <div className="mt-4 flex justify-end w-full">
              <Button onClick={() => setPreviewPhoto(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
