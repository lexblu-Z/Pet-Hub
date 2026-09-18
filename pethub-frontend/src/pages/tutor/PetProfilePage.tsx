import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Edit, PawPrint, Calendar, Syringe,
  ClipboardList, Stethoscope, Sparkles, AlertCircle, Weight,
  Hash, Heart, Plus, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Activity,
  Scissors, CalendarDays, Check, Camera, Trash2, Loader2, X
} from 'lucide-react';
import { api } from '@/services/api';
import { Badge, EmptyState } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { getSpeciesInfo, normalizeSpecies } from '@/utils/species';

function getAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  if (years === 0) {
    const months = Math.max(1, now.getMonth() - birth.getMonth());
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function getSpeciesFallbackAvatar(speciesRaw?: string | null): string {
  const norm = normalizeSpecies(speciesRaw);
  if (norm === 'cat') {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop';
  }
  if (norm === 'bird') {
    return 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?q=80&w=600&auto=format&fit=crop';
  }
  if (norm === 'rabbit' || norm === 'rodent') {
    return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=80&w=600&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop';
}

interface PendingPhoto {
  type: 'cover' | 'avatar';
  file: File;
  previewUrl: string;
}

export default function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('info');
  const [pet, setPet] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Photo editing state
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  useEffect(() => {
    async function loadPetData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [petRes, aptsRes] = await Promise.allSettled([
          api.get(`/pets/${id}`),
          api.get('/appointments/me'),
        ]);

        if (petRes.status === 'fulfilled' && petRes.value.data) {
          setPet(petRes.value.data);
        }
        if (aptsRes.status === 'fulfilled' && Array.isArray(aptsRes.value.data)) {
          setAppointments(aptsRes.value.data.filter((a: any) => a.petId === id));
        }
      } catch (err) {
        console.error('Erro ao carregar pet:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPetData();
  }, [id]);

  const speciesInfo = useMemo(() => {
    if (!pet) return { id: 'other', label: 'Pet' };
    return getSpeciesInfo(pet.species);
  }, [pet]);

  const sexFormatted = useMemo(() => {
    if (!pet) return 'Não informado';
    if (pet.gender === 'FEMALE' || pet.gender === 'Fêmea') return 'Fêmea';
    if (pet.gender === 'MALE' || pet.gender === 'Macho') return 'Macho';
    return 'Não informado';
  }, [pet]);

  const neuteredFormatted = useMemo(() => {
    if (!pet) return 'Não informado';
    if (pet.isNeutered === true) return 'Sim, castrado(a)';
    if (pet.isNeutered === false) return 'Não castrado(a)';
    return 'Não informado / Não sei';
  }, [pet]);

  const vaccinationStatusFormatted = useMemo(() => {
    if (!pet || !pet.vaccinationStatus) return { label: 'Não informado', variant: 'neutral' };
    const v = String(pet.vaccinationStatus).toUpperCase();
    if (v.includes('UP_TO_DATE') || v.includes('EM DIA')) {
      return { label: 'Sim, vacinas em dia', variant: 'success' };
    }
    if (v.includes('PENDING') || v.includes('ATRASAD')) {
      return { label: 'Não, está atrasado', variant: 'danger' };
    }
    if (v.includes('UNCERTAIN') || v.includes('CERTEZA')) {
      return { label: 'Não tenho certeza', variant: 'warning' };
    }
    return { label: 'Não sei / nunca acompanhei', variant: 'neutral' };
  }, [pet]);

  const vaccinesCount = useMemo(() => {
    if (!pet || !Array.isArray(pet.vaccines)) return 0;
    return pet.vaccines.length;
  }, [pet]);

  const handleFileChange = (type: 'cover' | 'avatar', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('O tamanho do arquivo não pode exceder 5MB.');
      if (e.target) e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({ type, file, previewUrl });
    if (e.target) e.target.value = '';
  };

  const handleCancelPending = () => {
    if (pendingPhoto?.previewUrl) {
      URL.revokeObjectURL(pendingPhoto.previewUrl);
    }
    setPendingPhoto(null);
  };

  const handleConfirmPhotoUpload = async () => {
    if (!pendingPhoto || !pet) return;
    setIsSavingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', pendingPhoto.file);

      const uploadRes = await api.post('/upload/pet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const rawUrl = uploadRes.data?.url;
      if (!rawUrl) throw new Error('Falha ao processar upload.');

      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `http://localhost:3000${rawUrl}`;
      const isCover = pendingPhoto.type === 'cover';
      const payload = isCover ? { coverPhoto: fullUrl } : { photo: fullUrl };

      const updateRes = await api.put(`/pets/${pet.id}`, payload);

      setPet((prev: any) => ({
        ...prev,
        ...updateRes.data,
        ...(isCover ? { coverPhoto: fullUrl } : { photo: fullUrl }),
      }));

      toast.success(isCover ? 'Foto de capa atualizada com sucesso!' : 'Foto do pet atualizada com sucesso!');
      handleCancelPending();
    } catch (err: any) {
      console.error('Erro ao enviar foto:', err);
      toast.error(err.response?.data?.error || 'Não foi possível atualizar a imagem. Tente novamente.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!pet || !pet.coverPhoto) return;
    setIsSavingPhoto(true);
    try {
      await api.put(`/pets/${pet.id}`, { coverPhoto: null });
      setPet((prev: any) => ({ ...prev, coverPhoto: null }));
      toast.success('Capa personalizada removida. Padrão restaurado.');
    } catch (err: any) {
      console.error('Erro ao remover capa:', err);
      toast.error('Não foi possível remover a capa.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-6">
        <div className="h-72 bg-neutral-100 dark:bg-[#1E1F20] rounded-3xl animate-pulse" />
        <div className="h-14 bg-neutral-100 dark:bg-[#1E1F20] rounded-2xl animate-pulse" />
        <div className="h-64 bg-neutral-100 dark:bg-[#1E1F20] rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-[#2A2B2D] flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <PawPrint size={32} />
        </div>
        <p className="text-neutral-500 dark:text-[#8E918F] font-semibold">
          Pet não encontrado ou você não tem permissão para acessá-lo.
        </p>
        <button
          onClick={() => navigate('/tutor/pets')}
          className="mt-4 text-orange-500 font-bold hover:underline cursor-pointer"
        >
          Voltar para Meus Pets
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Informações', icon: <PawPrint size={16} /> },
    { id: 'vacinas', label: 'Vacinas', icon: <Syringe size={16} />, badge: vaccinesCount > 0 ? vaccinesCount : undefined },
    { id: 'consultas', label: 'Agendamentos', icon: <CalendarDays size={16} />, badge: appointments.length > 0 ? appointments.length : undefined },
  ];

  const speciesFallback = getSpeciesFallbackAvatar(pet.species);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-20 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Hidden file inputs for independent photo uploads */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange('cover', e)}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange('avatar', e)}
      />

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tutor/pets')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#2A2B2D] transition-colors group cursor-pointer"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Meus Pets</span>
        </button>

        <Link
          to={`/tutor/pets/${pet.id}/editar`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-[#2A2B2D] hover:bg-neutral-200 dark:hover:bg-[#36383A] text-neutral-800 dark:text-[#E3E3E3] transition-colors border border-neutral-200 dark:border-[#3E4042] shadow-xs"
        >
          <Edit size={14} className="text-orange-500" />
          <span>Editar Perfil</span>
        </Link>
      </div>

      {/* 1. Pet Hero Card: Dedicated Cover + Overlaid Avatar + Core Info */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] shadow-xs overflow-hidden">
        {/* Dedicated Cover Container (aspect 16:6, min height, controlled overflow) */}
        <div className="relative aspect-[16/6] min-h-[190px] sm:min-h-[220px] md:min-h-[250px] max-h-[300px] w-full overflow-hidden bg-neutral-900 group">
          {pet.coverPhoto ? (
            <img
              src={pet.coverPhoto}
              alt={`Capa do perfil de ${pet.name}`}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.015]"
            />
          ) : (
            /* Refined fallback gradient with subtle decorative watermark (NEVER stretched pet photo) */
            <div className="w-full h-full bg-gradient-to-br from-[#1b1d22] via-[#242730] to-[#121316] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.03),_transparent_50%)]" />
              {/* Decorative watermark paw prints */}
              <PawPrint size={150} className="text-white/[0.03] absolute -right-6 -bottom-6 rotate-12 pointer-events-none select-none" />
              <PawPrint size={90} className="text-white/[0.02] absolute left-10 top-4 -rotate-12 pointer-events-none select-none" />
              <div className="text-white/35 text-xs font-medium tracking-wide flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xs select-none">
                <Sparkles size={13} className="text-orange-400/70" />
                <span>Perfil PetHub</span>
              </div>
            </div>
          )}

          {/* Subtle bottom gradient to enhance depth toward card body */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

          {/* Floating Actions on Cover */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
            {pet.coverPhoto && (
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={isSavingPhoto}
                aria-label="Remover foto de capa"
                title="Remover capa personalizada"
                className="p-2 sm:px-3 sm:py-1.5 bg-black/50 hover:bg-black/75 text-white/90 hover:text-white backdrop-blur-md rounded-xl text-xs font-medium border border-white/20 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span className="hidden sm:inline">Remover</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isSavingPhoto}
              aria-label="Alterar foto de capa"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-black/50 hover:bg-black/75 text-white backdrop-blur-md rounded-xl text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer hover:border-white/40"
            >
              <Camera size={14} className="text-orange-400" />
              <span className="text-xs">Alterar capa</span>
            </button>
          </div>
        </div>

        {/* Profile Info Section (Overlaid Avatar + Identity + Status Badges) */}
        <div className="px-5 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 md:-mt-20 mb-4">
            {/* Overlaid Pet Avatar with dedicated edit button */}
            <div className="relative group/avatar">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl border-4 border-white dark:border-[#1E1F20] bg-neutral-100 dark:bg-[#2A2B2D] shadow-xl overflow-hidden shrink-0">
                <img
                  src={pet.photo || speciesFallback}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Independent Avatar Edit Button */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isSavingPhoto}
                aria-label="Alterar foto do pet"
                title="Alterar foto do pet"
                className="absolute bottom-1 right-1 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 border-2 border-white dark:border-[#1E1F20] cursor-pointer"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* Badges on right side */}
            <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:mb-1">
              {pet.isNeutered === true && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold rounded-full">
                  <Scissors size={12} /> Castrado(a)
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                  vaccinationStatusFormatted.variant === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                    : vaccinationStatusFormatted.variant === 'danger'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                    : 'bg-neutral-100 dark:bg-[#2A2B2D] text-neutral-700 dark:text-[#C4C7C5] border-neutral-200 dark:border-[#3E4042]'
                }`}
              >
                <ShieldCheck size={13} /> {vaccinationStatusFormatted.label}
              </span>
            </div>
          </div>

          {/* Pet Header Data */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-[#E3E3E3] tracking-tight">
                {pet.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-900/50">
                {speciesInfo.label}
              </span>
            </div>

            <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{pet.breed || 'Raça não informada'}</span>
              <span>•</span>
              <span>{sexFormatted}</span>
              <span>•</span>
              <span>{pet.birthDate ? getAge(pet.birthDate) : (pet.approximateAge || 'Idade não informada')}</span>
              {pet.weight && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-neutral-700 dark:text-[#C4C7C5]">{pet.weight} kg</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Distinct Tab Navigation Bar: Clearly separated from the hero card above */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] shadow-xs p-1.5 flex gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-orange-500 text-white shadow-sm font-bold'
                  : 'text-neutral-600 dark:text-[#8E918F] hover:bg-neutral-100 dark:hover:bg-[#2A2B2D] hover:text-neutral-900 dark:hover:text-[#E3E3E3]',
              ].join(' ')}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-neutral-200 dark:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Section */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-6"
            >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-4 text-center shadow-xs">
                <Weight size={20} className="mx-auto mb-1.5 text-orange-500" />
                <p className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  {pet.weight ? `${pet.weight} kg` : '—'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Peso</p>
              </div>

              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-4 text-center shadow-xs">
                <PawPrint size={20} className="mx-auto mb-1.5 text-neutral-400" />
                <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">
                  {speciesInfo.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Espécie</p>
              </div>

              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-4 text-center shadow-xs">
                <Calendar size={20} className="mx-auto mb-1.5 text-blue-500" />
                <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">
                  {pet.birthDate ? getAge(pet.birthDate) : (pet.approximateAge || '—')}
                </p>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Idade</p>
              </div>
            </div>

            {/* General Info Card */}
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-5 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
                <PawPrint size={18} className="text-orange-500" /> Informações Gerais
              </h3>
              {[
                { label: 'Nome', value: pet.name },
                { label: 'Espécie', value: speciesInfo.label },
                { label: 'Raça', value: pet.breed || 'Não informada' },
                { label: 'Sexo', value: sexFormatted },
                { 
                  label: 'Data de Nascimento', 
                  value: pet.birthDate 
                    ? `${new Date(pet.birthDate).toLocaleDateString('pt-BR')} (${getAge(pet.birthDate)})` 
                    : (pet.approximateAge || 'Não informada') 
                },
                { label: 'Peso', value: pet.weight ? `${pet.weight} kg` : 'Não informado' },
                { label: 'Castrado/a', value: neuteredFormatted },
                { label: 'Status de Vacinação', value: vaccinationStatusFormatted.label },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between py-2 border-b border-neutral-100 dark:border-[#313335] last:border-0 text-sm">
                  <span className="text-neutral-500 dark:text-[#8E918F]">{item.label}</span>
                  <span className="font-medium text-neutral-900 dark:text-[#E3E3E3] text-right max-w-[65%]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Observações Comportamentais Card */}
            {pet.behaviorNotes && (
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-5 shadow-xs">
                <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2 mb-2">
                  <PawPrint size={18} className="text-orange-500" /> Observações Comportamentais
                </h3>
                <p className="text-neutral-700 dark:text-[#C4C7C5] text-sm leading-relaxed bg-neutral-50 dark:bg-[#2A2B2D] p-3.5 rounded-xl border border-neutral-200 dark:border-[#313335]">
                  {pet.behaviorNotes}
                </p>
              </div>
            )}

            {/* Condições e Restrições / Cuidados Especiais Card */}
            {(pet.specialCareNotes || pet.notes) && (
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-5 shadow-xs">
                <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} className="text-amber-500" /> Informações Importantes para Atendimento
                </h3>
                <p className="text-neutral-700 dark:text-[#C4C7C5] text-sm leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  {pet.specialCareNotes || pet.notes}
                </p>
              </div>
            )}

            {/* Ação de Edição: Botão como ÚLTIMO elemento da aba Informações */}
            <div className="pt-2 flex justify-start">
              <Link
                to={`/tutor/pets/${pet.id}/editar`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <Edit size={16} />
                <span>Editar Informações do Meu Pet</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Vacinas Tab */}
        {activeTab === 'vacinas' && (
          <motion.div
            key="vacinas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Status Overview Card */}
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-orange-500 shrink-0"><ShieldCheck size={24} /></div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  {vaccinationStatusFormatted.label}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                  Status geral informado pelo tutor no perfil do animal.
                </p>
              </div>
              <Link
                to={`/tutor/pets/${pet.id}/editar`}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600 underline"
              >
                Atualizar
              </Link>
            </div>

            {/* Detailed Vaccines List */}
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-3">
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
                    <Syringe size={18} className="text-orange-500" />
                    Vacinas Registradas ({vaccinesCount})
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                    Doses e aplicações conhecidas cadastradas para este pet.
                  </p>
                </div>
                <Link
                  to={`/tutor/pets/${pet.id}/editar`}
                  className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 text-xs font-semibold rounded-xl transition-colors"
                >
                  + Adicionar Vacina
                </Link>
              </div>

              {vaccinesCount > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-[#313335]">
                  {(pet.vaccines as Array<{ name: string; date?: string }>).map((vac, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">{vac.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                          {vac.date 
                            ? `Aplicada em: ${new Date(vac.date).toLocaleDateString('pt-BR')}` 
                            : 'Data de aplicação não informada'}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium rounded-full border border-emerald-200 dark:border-emerald-900/40">
                        Registrada
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 dark:text-[#8E918F] space-y-2">
                  <p className="text-sm">Nenhuma vacina individual registrada pelo tutor.</p>
                  <p className="text-xs">Você pode adicionar nomes e datas das vacinas editando o perfil.</p>
                </div>
              )}
            </div>

            {/* Recommendation if UNKNOWN or UNCERTAIN */}
            {(pet.vaccinationStatus === 'UNKNOWN' || pet.vaccinationStatus === 'UNCERTAIN') && (
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Acompanhamento Veterinário Recomendado</p>
                  <p className="mt-1 text-blue-800 dark:text-blue-300 leading-relaxed">
                    Manter o calendário vacinal do seu pet em dia previne doenças graves e é exigido para serviços como hospedagem, creche e banho/tosa.
                  </p>
                  <Link
                    to="/tutor/explore"
                    className="inline-block mt-2 font-bold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Buscar clínicas e veterinários parceiros →
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Consultas / Agendamentos Tab */}
        {activeTab === 'consultas' && (
          <motion.div
            key="consultas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt: any) => (
                  <div 
                    key={apt.id} 
                    className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-4 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{apt.service?.name || 'Serviço'}</p>
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                        {new Date(apt.date).toLocaleDateString('pt-BR')} às {new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-neutral-100 dark:bg-[#2A2B2D] text-neutral-700 dark:text-[#E3E3E3]">
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] p-8 text-center text-neutral-400 dark:text-[#8E918F]">
                <CalendarDays size={36} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm font-semibold">Nenhum agendamento encontrado para este pet.</p>
                <Link
                  to="/tutor/explore"
                  className="mt-3 inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Agendar um serviço
                </Link>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Photo Upload & Preview Confirmation Modal */}
      <AnimatePresence>
        {pendingPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200 dark:border-[#313335] shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      {pendingPhoto.type === 'cover' ? 'Confirmar nova foto de capa' : 'Confirmar foto do pet'}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                      {pendingPhoto.type === 'cover'
                        ? 'Esta imagem horizontal será usada como capa decorativa do perfil.'
                        : 'Esta foto será usada como avatar principal do seu pet.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPending}
                  disabled={isSavingPhoto}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#2A2B2D] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Aspect Ratio Adjust Preview Box */}
              <div className="my-5">
                {pendingPhoto.type === 'cover' ? (
                  <div className="aspect-[16/6] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-[#313335] shadow-inner">
                    <img
                      src={pendingPhoto.previewUrl}
                      alt="Pré-visualização da capa"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-3xl overflow-hidden bg-neutral-900 border-4 border-white dark:border-[#2A2B2D] shadow-xl">
                    <img
                      src={pendingPhoto.previewUrl}
                      alt="Pré-visualização do pet"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}

                <p className="text-center text-xs text-neutral-500 dark:text-[#8E918F] mt-3">
                  Arquivo: <span className="font-medium text-neutral-700 dark:text-[#C4C7C5]">{pendingPhoto.file.name}</span>{' '}
                  ({(pendingPhoto.file.size / 1024).toFixed(0)} KB)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-[#313335]">
                <button
                  type="button"
                  onClick={handleCancelPending}
                  disabled={isSavingPhoto}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#2A2B2D] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPhotoUpload}
                  disabled={isSavingPhoto}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPhoto ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Salvar Foto</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
