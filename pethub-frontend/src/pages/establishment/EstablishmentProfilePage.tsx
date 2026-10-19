import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Building2, MapPin, Phone, Mail, Clock, Camera, Plus, Trash2, CheckCircle, Search, ShieldCheck, Upload, PawPrint, AlertCircle, AlertTriangle } from 'lucide-react';
import { Input, Button, Badge, Modal } from '@/components/ui';
import { SPECIES_OPTIONS } from '@/utils/species';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

interface WorkingDay {
  isOpen: boolean;
  open: string;
  close: string;
}

const dayNames: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function EstablishmentProfilePage() {
  const { currentUser } = useAuthStore();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business Information
  const [businessName, setBusinessName] = useState('');
  const [type, setType] = useState('Pet shop');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Official Address (Ourinhos - SP)
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ourinhos');
  const [state, setState] = useState('SP');

  // Address Request Workflow
  const [addressRequest, setAddressRequest] = useState<any | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [submittingAddressReq, setSubmittingAddressReq] = useState(false);

  const [reqCep, setReqCep] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [reqCity, setReqCity] = useState('Ourinhos');
  const [reqState, setReqState] = useState('SP');
  const [reqReason, setReqReason] = useState('');
  const [isReqCepLoading, setIsReqCepLoading] = useState(false);

  // Accepted Species
  const [acceptedSpecies, setAcceptedSpecies] = useState<string[]>(['dog', 'cat']);

  const handleToggleAcceptedSpecies = (speciesId: string) => {
    setAcceptedSpecies(prev => {
      if (prev.includes(speciesId)) {
        if (prev.length === 1) {
          toast.error('O estabelecimento precisa atender pelo menos 1 espécie.');
          return prev;
        }
        return prev.filter(s => s !== speciesId);
      } else {
        return [...prev, speciesId];
      }
    });
  };

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');

  // Hours
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingDay>>({
    monday: { isOpen: true, open: '08:00', close: '18:00' },
    tuesday: { isOpen: true, open: '08:00', close: '18:00' },
    wednesday: { isOpen: true, open: '08:00', close: '18:00' },
    thursday: { isOpen: true, open: '08:00', close: '18:00' },
    friday: { isOpen: true, open: '08:00', close: '18:00' },
    saturday: { isOpen: true, open: '08:00', close: '14:00' },
    sunday: { isOpen: false, open: '09:00', close: '12:00' },
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/establishment/profile');
      const p = res.data.establishmentProfile || {};
      setBusinessName(p.businessName || res.data.name || '');
      setType(p.type || 'Pet shop');
      setDescription(p.description || '');
      setPhone(p.phone || res.data.phone || '');
      setEmail(p.email || res.data.email || '');
      setAddress(p.address || '');
      setCep(p.zipCode || '');
      setCity(p.city || 'Ourinhos');
      setState(p.state || 'SP');
      setPhotos(p.photos || []);
      setAcceptedSpecies(Array.isArray(p.acceptedSpecies) && p.acceptedSpecies.length > 0 ? p.acceptedSpecies : ['dog', 'cat']);

      const hoursRes = await api.get('/establishment/hours');
      if (hoursRes.data && typeof hoursRes.data === 'object') {
        setWorkingHours(prev => ({ ...prev, ...hoursRes.data }));
      }

      await fetchAddressRequest();
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Erro ao carregar dados do estabelecimento.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressRequest = async () => {
    try {
      const res = await api.get('/establishment/address-request');
      setAddressRequest(res.data?.request || null);
    } catch (err) {
      console.error('Error fetching address request:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleReqCepLookup = async (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setReqCep(formatted);

    if (raw.length === 8) {
      setIsReqCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (data && !data.erro) {
          if (data.localidade && data.localidade.toLowerCase() !== 'ourinhos') {
            toast.error('O PetHub opera exclusivamente em Ourinhos - SP.');
            return;
          }
          setReqAddress(`${data.logradouro || ''}${data.bairro ? ` - ${data.bairro}` : ''}`);
          setReqCity(data.localidade || 'Ourinhos');
          setReqState(data.uf || 'SP');
          toast.success('Endereço localizado via CEP!');
        } else {
          toast.error('CEP não encontrado na base dos Correios.');
        }
      } catch (err) {
        console.error('Error fetching CEP:', err);
      } finally {
        setIsReqCepLoading(false);
      }
    }
  };

  const handleSubmitAddressRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqAddress.trim() || reqAddress.trim().length < 5) {
      toast.error('Informe o logradouro completo com número.');
      return;
    }

    setSubmittingAddressReq(true);
    try {
      const res = await api.post('/establishment/address-request', {
        requestedAddress: reqAddress.trim(),
        requestedZipCode: reqCep.trim() || null,
        requestedCity: reqCity.trim() || 'Ourinhos',
        requestedState: reqState.trim() || 'SP',
        reason: reqReason.trim() || null,
      });

      toast.success(res.data?.message || 'Solicitação enviada com sucesso para aprovação do Administrador!');
      setAddressModalOpen(false);
      setReqReason('');
      await fetchAddressRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar solicitação.');
    } finally {
      setSubmittingAddressReq(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!businessName) {
      toast.error('Nome do estabelecimento é obrigatório.');
      return;
    }
    if (!acceptedSpecies || acceptedSpecies.length === 0) {
      toast.error('Selecione pelo menos uma espécie de animal atendida.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/establishment/profile', {
        businessName,
        type,
        description,
        phone,
        email,
        acceptedSpecies,
      });

      await api.put('/establishment/hours', workingHours);

      toast.success('Informações salvas com sucesso no banco!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar informações.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const uploadRes = await api.post('/upload/image', formData);
        if (uploadRes.data?.url) {
          const res = await api.post('/establishment/photos', { photoUrl: uploadRes.data.url });
          setPhotos(res.data.photos);
          useAuthStore.getState().setUser({
            ...currentUser,
            establishmentProfile: {
              ...(currentUser as any)?.establishmentProfile,
              photos: res.data.photos,
            }
          } as any);
        }
      }
      toast.success('Foto(s) adicionada(s) com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (url: string) => {
    try {
      const res = await api.delete('/establishment/photos', { data: { photoUrl: url } });
      setPhotos(res.data.photos);
      useAuthStore.getState().setUser({
        ...currentUser,
        establishmentProfile: {
          ...(currentUser as any)?.establishmentProfile,
          photos: res.data.photos,
        }
      } as any);
      toast.success('Foto removida!');
    } catch (err) {
      toast.error('Erro ao remover foto.');
    }
  };

  const toggleDay = (dayKey: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        isOpen: !prev[dayKey].isOpen,
      }
    }));
  };

  const updateTime = (dayKey: string, field: 'open' | 'close', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando dados do estabelecimento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Meu Estabelecimento</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
            Gerencie as informações públicas, fotos e horários de atendimento da sua empresa
          </p>
        </div>
        <Button onClick={handleSaveProfile} isLoading={saving} className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
          Salvar Alterações
        </Button>
      </div>

      {/* 1. Basic Information */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#313335] font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
          <Building2 size={18} className="text-orange-500" />
          <span>Informações do Negócio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome Fantasia do Estabelecimento *"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: PetCare Ourinhos Centro"
            required
          />

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1.5">
              Categoria / Tipo *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-3.5 py-2.5 text-xs font-medium text-neutral-800 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="Pet shop">Pet shop</option>
              <option value="Clínica veterinária">Clínica veterinária</option>
              <option value="Hospital veterinário">Hospital veterinário</option>
              <option value="Banho e tosa">Banho e tosa</option>
              <option value="Hotel para pets">Hotel para pets</option>
              <option value="Creche / Daycare">Creche / Daycare</option>
              <option value="Adestramento">Adestramento</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <Input
            label="Telefone / WhatsApp Comercial"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(14) 99888-7766"
            leftIcon={<Phone size={14} />}
          />

          <Input
            label="E-mail de Contato Público"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@seupetshop.com.br"
            leftIcon={<Mail size={14} />}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1.5">
            Descrição e Apresentação do Estabelecimento
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Conte a história, os diferenciais e a dedicação da sua equipe aos pets..."
            className="w-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] rounded-xl p-3 text-xs text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
          />
        </div>
      </div>

      {/* 2. Accepted Species */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#313335]">
          <div className="flex items-center gap-2.5 font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
            <PawPrint size={20} className="text-orange-500" />
            <span>Espécies Atendidas</span>
          </div>
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-full border border-orange-200/50 dark:border-orange-900/30">
            {acceptedSpecies.length} selecionada(s)
          </span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
          Indique quais espécies de animais seu estabelecimento tem capacidade técnica e estrutura para receber. Isso garante que os tutores encontrem você e apenas agendem para pets compatíveis.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {SPECIES_OPTIONS.map((opt) => {
            const isSelected = acceptedSpecies.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleToggleAcceptedSpecies(opt.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                    : 'bg-neutral-50/50 dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <SpeciesIcon speciesId={opt.id} size={17} className={isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-400'} />
                  <span>{opt.label}</span>
                </span>
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {isSelected && <CheckCircle size={12} className="stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Official Address (Ourinhos - SP) with Admin Approval Workflow */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#313335] gap-3">
          <div className="flex items-center gap-2.5 font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
            <MapPin size={18} className="text-orange-500" />
            <span>Localização e Endereço Oficial</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
              <ShieldCheck size={13} />
              Endereço Homologado
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setReqCep(cep);
                setReqAddress(address);
                setReqReason('');
                setAddressModalOpen(true);
              }}
              disabled={addressRequest?.status === 'PENDING'}
              className="text-xs"
            >
              {addressRequest?.status === 'PENDING' ? 'Alteração em Análise' : 'Solicitar alteração de endereço'}
            </Button>
          </div>
        </div>

        {/* Pending Request Alert */}
        {addressRequest?.status === 'PENDING' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
              <Clock size={16} />
              <span>Solicitação de alteração de endereço em análise pelo Administrador</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Novo endereço solicitado:</strong> {addressRequest.requestedAddress}, {addressRequest.requestedCity} - {addressRequest.requestedState} {addressRequest.requestedZipCode ? `(CEP: ${addressRequest.requestedZipCode})` : ''}
            </p>
            {addressRequest.reason && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400/80">
                <strong>Justificativa:</strong> {addressRequest.reason}
              </p>
            )}
            <p className="text-[10px] text-amber-500">
              Enviada em {new Date(addressRequest.createdAt).toLocaleDateString('pt-BR')}. Enquanto a solicitação estiver em análise, seu endereço oficial permanece inalterado.
            </p>
          </div>
        )}

        {/* Rejected Request Alert */}
        {addressRequest?.status === 'REJECTED' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-xs">
              <AlertCircle size={16} />
              <span>Última solicitação de alteração recusada pela moderação</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              <strong>Motivo informado:</strong> {addressRequest.rejectionReason || 'Dados inconsistentes.'}
            </p>
            <p className="text-[11px] text-rose-500">
              Você pode enviar uma nova solicitação clicando no botão acima com os dados corrigidos.
            </p>
          </div>
        )}

        {/* Current official address fields (Read-only) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input
              label="CEP Oficial"
              value={cep || '19900-000'}
              readOnly
              className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Logradouro e Número Oficial"
              value={address || 'Endereço ainda não cadastrado'}
              readOnly
              className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Cidade" value={city} readOnly className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-500 dark:text-[#8E918F]" />
          <Input label="Estado" value={state} readOnly className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-500 dark:text-[#8E918F]" />
        </div>
      </div>

      {/* 3. Photos Gallery */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#313335]">
          <div className="flex items-center gap-2.5 font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
            <Camera size={18} className="text-orange-500" />
            <span>Fotos do Estabelecimento</span>
          </div>
          <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium">{photos.length} fotos</span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
          Adicione fotos da fachada, recepção, baias, banho e tosa e consultório. A primeira foto será a foto principal do estabelecimento.
        </p>

        {/* Real File Upload from Computer / Phone */}
        <input
          type="file"
          ref={photoFileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => photoFileInputRef.current?.click()}
          disabled={isUploadingPhoto}
          className="w-full border-2 border-dashed border-orange-300 dark:border-orange-500/40 hover:border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 hover:bg-orange-50/80 dark:hover:bg-orange-950/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-neutral-700 dark:text-[#C4C7C5] transition-all cursor-pointer"
        >
          <div className="w-11 h-11 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shadow-xs">
            <Upload size={22} className={isUploadingPhoto ? "animate-bounce" : ""} />
          </div>
          <span className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
            {isUploadingPhoto ? 'Enviando foto...' : 'Adicionar fotos do estabelecimento'}
          </span>
          <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
            Clique para selecionar fotos do seu computador ou celular (PNG, JPG, WebP)
          </span>
        </button>

        {/* Photos grid */}
        {photos.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50 dark:bg-[#282A2C] rounded-xl border border-dashed border-neutral-200 dark:border-[#313335]">
            <Camera size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5]">Nenhuma foto adicionada ainda</p>
            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-0.5">Fotos atraem mais tutores para agendar com você</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] aspect-video bg-neutral-100 dark:bg-[#282A2C]">
                <img src={getFullImageUrl(url)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(url)}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Working Hours */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#313335] font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">
          <Clock size={18} className="text-orange-500" />
          <span>Horários de Funcionamento</span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
          Defina os dias e horários em que os tutores podem agendar serviços no seu estabelecimento.
        </p>

        <div className="divide-y divide-neutral-100 dark:divide-[#313335]">
          {Object.entries(workingHours).map(([dayKey, val]) => (
            <div key={dayKey} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-44">
                <input
                  type="checkbox"
                  id={`day-${dayKey}`}
                  checked={val.isOpen}
                  onChange={() => toggleDay(dayKey)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor={`day-${dayKey}`} className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3] cursor-pointer">
                  {dayNames[dayKey] || dayKey}
                </label>
              </div>

              {val.isOpen ? (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="time"
                    value={val.open}
                    onChange={(e) => updateTime(dayKey, 'open', e.target.value)}
                    className="border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] rounded-lg px-2 py-1 text-neutral-800 dark:text-[#E3E3E3] font-medium"
                  />
                  <span className="text-neutral-400 dark:text-[#8E918F]">até</span>
                  <input
                    type="time"
                    value={val.close}
                    onChange={(e) => updateTime(dayKey, 'close', e.target.value)}
                    className="border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] rounded-lg px-2 py-1 text-neutral-800 dark:text-[#E3E3E3] font-medium"
                  />
                </div>
              ) : (
                <span className="text-xs font-semibold text-neutral-400 dark:text-[#8E918F] bg-neutral-100 dark:bg-[#282A2C] px-3 py-1 rounded-lg">
                  Fechado
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] flex justify-end">
          <Button onClick={handleSaveProfile} isLoading={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            Salvar Perfil e Horários
          </Button>
        </div>
      </div>

      {/* Address Request Modal */}
      <Modal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title="Solicitar Alteração de Endereço Oficial"
        size="md"
      >
        <form onSubmit={handleSubmitAddressRequest} className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
            Para garantir a segurança dos tutores e a conformidade do PetHub, alterações de endereço físico passam por validação administrativa antes de se tornarem oficiais.
          </p>

          <div className="space-y-3">
            <div>
              <Input
                label="Novo CEP (ViaCEP) *"
                value={reqCep}
                onChange={(e) => handleReqCepLookup(e.target.value)}
                placeholder="19900-010"
                maxLength={9}
                required
                leftIcon={<Search size={14} className={isReqCepLoading ? 'animate-spin text-orange-500' : ''} />}
              />
            </div>

            <div>
              <Input
                label="Novo Logradouro e Número *"
                value={reqAddress}
                onChange={(e) => setReqAddress(e.target.value)}
                placeholder="Ex: Rua Nove de Julho, 120 - Centro"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Cidade" value={reqCity} readOnly className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-500" />
              <Input label="Estado" value={reqState} readOnly className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1.5">
                Motivo / Justificativa da Mudança *
              </label>
              <textarea
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                rows={3}
                required
                placeholder="Ex: Mudança para prédio próprio com maior espaço para banho e tosa..."
                className="w-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] rounded-xl p-3 text-xs text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-[#313335]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddressModalOpen(false)}
              disabled={submittingAddressReq}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={submittingAddressReq}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Enviar Solicitação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
