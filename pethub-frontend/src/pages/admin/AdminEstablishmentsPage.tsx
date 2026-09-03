import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import {
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  MapPin,
  Camera,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import { Input, Button, Badge, Modal, Avatar } from '@/components/ui';

export default function AdminEstablishmentsPage() {
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEstab, setSelectedEstab] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Suspension Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendPeriod, setSuspendPeriod] = useState('7d'); // '24h' | '3d' | '7d' | '15d' | '30d' | '90d' | 'custom'
  const [customAmount, setCustomAmount] = useState('10');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('days');
  const [suspensionReason, setSuspensionReason] = useState('');

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const toast = useToast();

  const fetchEstablishments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/establishments');
      setEstablishments(res.data);
    } catch (err) {
      console.error('Error loading establishments:', err);
      toast.error('Erro ao carregar lista de estabelecimentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstablishments();
  }, []);

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.put(`/admin/establishments/${id}/status`, {
        status: 'ACTIVE',
      });
      toast.success('Estabelecimento aprovado com sucesso!');

      setEstablishments(prev => prev.map(e => {
        if (e.id === id || e.establishmentProfile?.id === id) {
          return {
            ...e,
            establishmentProfile: {
              ...(e.establishmentProfile || {}),
              status: 'ACTIVE',
              rejectionReason: null,
              suspendedUntil: null,
              suspensionReason: null,
            }
          };
        }
        return e;
      }));

      setSelectedEstab(null);
      fetchEstablishments();
    } catch (err: any) {
      console.error('Approve error:', err);
      const msg = err.response?.data?.error || 'Erro ao aprovar estabelecimento.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEstab) return;
    if (!rejectionReason.trim()) {
      toast.error('O motivo da reprovação é obrigatório.');
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = selectedEstab.id;
      const reason = rejectionReason.trim();

      await api.put(`/admin/establishments/${targetId}/status`, {
        status: 'REJECTED',
        rejectionReason: reason,
      });

      setEstablishments(prev => prev.map(e => {
        if (e.id === targetId || e.establishmentProfile?.id === targetId) {
          return {
            ...e,
            establishmentProfile: {
              ...(e.establishmentProfile || {}),
              status: 'REJECTED',
              rejectionReason: reason,
              suspendedUntil: null,
              suspensionReason: null,
            }
          };
        }
        return e;
      }));

      setRejectModalOpen(false);
      setSelectedEstab(null);
      setRejectionReason('');
      toast.success('Estabelecimento reprovado com sucesso.');

      fetchEstablishments();
    } catch (err: any) {
      console.error('Reject error:', err);
      const msg = err.response?.data?.error || 'Erro ao reprovar estabelecimento.';
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
    if (!selectedEstab) return;
    if (!suspensionReason.trim()) {
      toast.error('O motivo da suspensão é obrigatório.');
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = selectedEstab.id;
      const suspendedUntil = calculateSuspendedUntil();
      const reason = suspensionReason.trim();

      await api.put(`/admin/establishments/${targetId}/status`, {
        status: 'SUSPENDED',
        suspendedUntil,
        suspensionReason: reason,
      });

      setEstablishments(prev => prev.map(e => {
        if (e.id === targetId || e.establishmentProfile?.id === targetId) {
          return {
            ...e,
            establishmentProfile: {
              ...(e.establishmentProfile || {}),
              status: 'SUSPENDED',
              suspendedUntil,
              suspensionReason: reason,
              suspendedAt: new Date().toISOString(),
            }
          };
        }
        return e;
      }));

      setSuspendModalOpen(false);
      setSelectedEstab(null);
      setSuspensionReason('');
      toast.success('Estabelecimento suspenso temporariamente.');

      fetchEstablishments();
    } catch (err: any) {
      console.error('Suspension error:', err);
      const msg = err.response?.data?.error || 'Erro ao suspender estabelecimento.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.put(`/admin/establishments/${id}/status`, {
        status: 'ACTIVE',
      });

      setEstablishments(prev => prev.map(e => {
        if (e.id === id || e.establishmentProfile?.id === id) {
          return {
            ...e,
            establishmentProfile: {
              ...(e.establishmentProfile || {}),
              status: 'ACTIVE',
              suspendedUntil: null,
              suspensionReason: null,
              suspendedAt: null,
            }
          };
        }
        return e;
      }));

      setSelectedEstab(null);
      toast.success('Conta do estabelecimento reativada com sucesso!');
      fetchEstablishments();
    } catch (err: any) {
      console.error('Reactivate error:', err);
      toast.error('Erro ao reativar conta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = establishments.filter((e) => {
    const profile = e.establishmentProfile || {};
    const bName = (profile.businessName || e.name || '').toLowerCase();
    const uName = (e.name || '').toLowerCase();
    const uEmail = (e.email || '').toLowerCase();
    const q = search.toLowerCase().trim();
    
    const matchesSearch = !q || bName.includes(q) || uName.includes(q) || uEmail.includes(q);
    const matchesStatus = statusFilter === 'ALL' || profile.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">✓ Aprovado</Badge>;
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gerenciamento de Estabelecimentos</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Analise, aprove, suspenda ou gerencie cadastros com dados reais do PostgreSQL</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-neutral-700">
            Total: {establishments.length}
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            Pendentes: {establishments.filter(e => e.establishmentProfile?.status === 'PENDING_APPROVAL').length}
          </span>
          <span className="px-3 py-1.5 bg-green-50 text-green-800 rounded-xl border border-green-200">
            Aprovados: {establishments.filter(e => e.establishmentProfile?.status === 'ACTIVE').length}
          </span>
          <span className="px-3 py-1.5 bg-orange-50 text-orange-800 rounded-xl border border-orange-200">
            Suspensos: {establishments.filter(e => e.establishmentProfile?.status === 'SUSPENDED').length}
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por nome fantasia, responsável ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING_APPROVAL', label: 'Pendentes ⏳' },
            { id: 'ACTIVE', label: 'Aprovados ✓' },
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
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando estabelecimentos do PostgreSQL...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-sm font-bold text-neutral-600">Nenhum estabelecimento encontrado.</p>
            <p className="text-xs text-neutral-400 mt-1">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Estabelecimento</th>
                  <th className="py-3.5 px-4">Categoria / Tipo</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Data de Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((e) => {
                  const profile = e.establishmentProfile || {};
                  const businessName = profile.businessName || e.name;
                  const status = profile.status || 'PENDING_APPROVAL';
                  const photosCount = (profile.photos || []).length;
                  const photoSrc = profile.photos?.[0] || e.avatar;

                  return (
                    <tr key={e.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={photoSrc}
                            name={businessName}
                            size="sm"
                            isEstablishment={true}
                          />
                          <div>
                            <div className="font-bold text-neutral-900">{businessName}</div>
                            <div className="text-xs text-neutral-400 flex items-center gap-2">
                              <span>Resp: {e.name}</span>
                              {photosCount > 0 ? (
                                <span className="text-orange-600 font-semibold flex items-center gap-0.5">
                                  <Camera size={11} /> {photosCount} foto(s)
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">
                                  (Avatar padrão)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-1 rounded-lg">
                          {profile.type || 'Pet shop'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-neutral-600 flex items-center gap-1">
                          <MapPin size={12} className="text-orange-500 shrink-0" />
                          {profile.city || 'Ourinhos'} - {profile.state || 'SP'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-500">
                        {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedEstab(e)}
                            className="text-neutral-600 hover:text-neutral-900"
                            title="Ver detalhes completos e fotos"
                          >
                            <Eye size={15} className="mr-1" /> Detalhes
                          </Button>

                          {/* Distinct Actions based on Status */}
                          {status === 'PENDING_APPROVAL' && (
                            <>
                              <Button
                                size="xs"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(e.id)}
                                isLoading={isProcessing}
                                title="Aprovar estabelecimento"
                              >
                                <CheckCircle size={14} className="mr-1" /> Aprovar
                              </Button>
                              <Button
                                size="xs"
                                variant="danger"
                                onClick={() => {
                                  setSelectedEstab(e);
                                  setRejectModalOpen(true);
                                }}
                                isLoading={isProcessing}
                                title="Reprovar estabelecimento"
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
                                setSelectedEstab(e);
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
                              onClick={() => handleReactivate(e.id)}
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
      {selectedEstab && !rejectModalOpen && !suspendModalOpen && (
        <Modal
          isOpen={!!selectedEstab}
          onClose={() => setSelectedEstab(null)}
          title="Detalhes do Estabelecimento"
          size="lg"
        >
          <div className="space-y-6 text-sm max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Identity Header */}
            <div className="flex items-start justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedEstab.establishmentProfile?.photos?.[0] || selectedEstab.avatar}
                  name={selectedEstab.establishmentProfile?.businessName || selectedEstab.name}
                  size="xl"
                  isEstablishment={true}
                  square={true}
                />
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    {selectedEstab.establishmentProfile?.businessName || selectedEstab.name}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Responsável: <span className="font-semibold text-neutral-800">{selectedEstab.name}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    E-mail: <span className="font-semibold text-neutral-800">{selectedEstab.email}</span>
                  </p>
                </div>
              </div>
              <div>
                {getStatusBadge(selectedEstab.establishmentProfile?.status || 'PENDING_APPROVAL')}
              </div>
            </div>

            {/* If Suspended: Show Alert Card */}
            {selectedEstab.establishmentProfile?.status === 'SUSPENDED' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <span>Conta Temporariamente Suspensa</span>
                </div>
                <p className="text-xs">
                  <span className="font-bold">Motivo:</span> {selectedEstab.establishmentProfile.suspensionReason || 'Violação das regras da plataforma.'}
                </p>
                {selectedEstab.establishmentProfile.suspendedUntil && (
                  <p className="text-xs">
                    <span className="font-bold">Término previsto:</span> {new Date(selectedEstab.establishmentProfile.suspendedUntil).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            {/* If Rejected: Show Rejection Notice */}
            {selectedEstab.establishmentProfile?.status === 'REJECTED' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                  <XCircle size={18} className="text-red-600 shrink-0" />
                  <span>Cadastro Reprovado</span>
                </div>
                <p className="text-xs">
                  <span className="font-bold">Motivo registrado:</span> {selectedEstab.establishmentProfile.rejectionReason || 'Não especificado.'}
                </p>
              </div>
            )}

            {/* Mandatory Photos Section */}
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm">
                  <Camera size={16} className="text-orange-500" />
                  <span>Fotos do Local & Fachada</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md">
                  {(selectedEstab.establishmentProfile?.photos || []).length} foto(s)
                </span>
              </div>

              {(!selectedEstab.establishmentProfile?.photos || selectedEstab.establishmentProfile.photos.length === 0) ? (
                <div className="p-6 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-2xl overflow-hidden">
                    <video src="/user_estabelecimento.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs font-bold text-neutral-700">Nenhuma foto própria enviada</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Exibindo vídeo padrão do estabelecimento como fallback.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedEstab.establishmentProfile.photos.map((url: string, idx: number) => {
                    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                    return (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhoto(fullUrl)}
                        className="group relative rounded-xl overflow-hidden border border-neutral-200 aspect-video bg-neutral-100 cursor-pointer shadow-xs hover:border-orange-400 transition-all"
                      >
                        <img src={fullUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ExternalLink size={14} /> Ampliar
                        </div>
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                            Principal
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Registration Data */}
            <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 text-neutral-900 font-bold text-sm">
                <Building2 size={16} className="text-orange-500" />
                <span>Dados do Negócio</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block font-semibold">Tipo / Categoria:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedEstab.establishmentProfile?.type || 'Pet shop'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">CNPJ / CPF:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedEstab.establishmentProfile?.document || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Telefone / WhatsApp:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedEstab.phone || selectedEstab.establishmentProfile?.phone || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">Localização:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedEstab.establishmentProfile?.address || 'Endereço não informado'}, {selectedEstab.establishmentProfile?.city || 'Ourinhos'} - {selectedEstab.establishmentProfile?.state || 'SP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-neutral-100 flex flex-wrap gap-3 justify-end items-center">
              <Button variant="ghost" onClick={() => setSelectedEstab(null)}>
                Fechar
              </Button>

              {/* Strict actions per status */}
              {selectedEstab.establishmentProfile?.status === 'PENDING_APPROVAL' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setRejectModalOpen(true)}
                    isLoading={isProcessing}
                  >
                    <XCircle size={16} className="mr-1.5" /> Reprovar Estabelecimento
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(selectedEstab.id)}
                    isLoading={isProcessing}
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Aprovar Estabelecimento
                  </Button>
                </>
              )}

              {selectedEstab.establishmentProfile?.status === 'ACTIVE' && (
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setSuspendModalOpen(true)}
                >
                  <PauseCircle size={16} className="mr-1.5" /> Suspender temporariamente
                </Button>
              )}

              {selectedEstab.establishmentProfile?.status === 'SUSPENDED' && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleReactivate(selectedEstab.id)}
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
      {rejectModalOpen && selectedEstab && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reprovar estabelecimento?"
          size="md"
        >
          <div className="space-y-4 text-sm">
            <p className="text-neutral-600 text-xs">
              Informe o motivo da reprovação de <span className="font-bold text-neutral-900">{selectedEstab.establishmentProfile?.businessName || selectedEstab.name}</span>. Essa justificativa ficará salva no sistema.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Motivo da reprovação <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Documentação inconsistente ou fachada incompatível com a categoria..."
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
      {suspendModalOpen && selectedEstab && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title="Suspender conta temporariamente?"
          size="md"
        >
          <div className="space-y-5 text-sm">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">Impacto da suspensão:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>O estabelecimento perderá temporariamente acesso às funcionalidades comerciais.</li>
                <li>Não poderá receber novos agendamentos nem realizar vendas de produtos.</li>
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
                placeholder="Ex: Violação das regras da plataforma ou irregularidade sanitária reportada..."
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

      {/* Photo Zoom Modal */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title="Foto Ampliada do Estabelecimento"
          size="lg"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 max-h-[70vh] flex items-center justify-center">
              <img src={previewPhoto} alt="Foto do estabelecimento em alta resolução" className="w-full h-full object-contain max-h-[70vh]" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setPreviewPhoto(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
