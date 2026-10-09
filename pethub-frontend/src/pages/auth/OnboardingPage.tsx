import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, ChevronRight, Camera, Dog, ArrowRight, ArrowLeft, 
  X, Plus, Loader2, ChevronDown, ChevronUp, Search, Sparkles, 
  PawPrint, ShieldCheck, Calendar, Weight, Activity, AlertCircle,
  Scissors, Heart, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { formatCPF, validateCPF } from '@/utils/documentValidation';
import { 
  SPECIES_OPTIONS, 
  searchBreedsBySpecies, 
  normalizeSpecies, 
  getSpeciesInfo 
} from '@/utils/species';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { getApproximateAgeOptions } from '@/utils/speciesAgeRules';

interface PetDraft {
  name: string;
  species: string;
  breed: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  ageMode: 'exact' | 'approximate' | 'unknown';
  birthDate: string;
  approximateAge: string;
  weight: string;
  weightUnknown: boolean;
  isNeutered: boolean | null;
  vaccinationStatus: 'UP_TO_DATE' | 'PENDING' | 'UNKNOWN';
  specialCareNotes: string;
  photoFile: File | null;
  photoPreview: string | null;
}

const createInitialPet = (): PetDraft => ({
  name: '',
  species: 'dog',
  breed: '',
  gender: 'UNKNOWN',
  ageMode: 'unknown',
  birthDate: '',
  approximateAge: '',
  weight: '',
  weightUnknown: false,
  isNeutered: null,
  vaccinationStatus: 'UNKNOWN',
  specialCareNotes: '',
  photoFile: null,
  photoPreview: null,
});

export default function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CPF Verification for Tutor (mandatory rule)
  const hasDocument = Boolean((currentUser as any)?.document?.trim());
  const [step, setStep] = useState(hasDocument ? 1 : 0);
  const [tutorCpf, setTutorCpf] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isSavingCpf, setIsSavingCpf] = useState(false);

  // Steps: 0 = CPF requirement (if missing), 1 = Initial question (has pet?), 2 = How many pets?, 3 = Pet details forms
  const [hasPet, setHasPet] = useState<boolean | null>(null);
  const [petCount, setPetCount] = useState<number>(1);
  const [activePetIndex, setActivePetIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Array of pets being registered
  const [pets, setPets] = useState<PetDraft[]>([createInitialPet()]);

  // Dropdown states for active pet
  const [isSpeciesOpen, setIsSpeciesOpen] = useState(false);
  const [isBreedOpen, setIsBreedOpen] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentPet = pets[activePetIndex] || pets[0];

  useEffect(() => {
    if (hasDocument && step === 0) {
      setStep(1);
    }
  }, [hasDocument, step]);

  const handleCpfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docVal = validateCPF(tutorCpf);
    if (!docVal.isValid) {
      const err = docVal.error || 'Informe um CPF válido.';
      setCpfError(err);
      toast.error(err);
      return;
    }
    setCpfError(null);
    setIsSavingCpf(true);
    try {
      const res = await api.put('/users/me/profile', { document: tutorCpf.trim() });
      if (res.data?.user) {
        setUser({ ...(currentUser as any), ...res.data.user });
      }
      toast.success('CPF validado com sucesso!');
      setStep(1);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao validar e salvar CPF.';
      setCpfError(msg);
      toast.error(msg);
    } finally {
      setIsSavingCpf(false);
    }
  };

  const handlePetCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    setPetCount(validCount);
    setPets(prev => {
      const next = [...prev];
      while (next.length < validCount) {
        next.push(createInitialPet());
      }
      return next.slice(0, validCount);
    });
    if (activePetIndex >= validCount) {
      setActivePetIndex(validCount - 1);
    }
  };

  const updateCurrentPet = (updates: Partial<PetDraft>) => {
    setPets(prev => {
      const next = [...prev];
      next[activePetIndex] = { ...next[activePetIndex], ...updates };
      return next;
    });
  };

  const handleSpeciesSelect = (newSpecies: string) => {
    // Changing species immediately clears breed and search query
    updateCurrentPet({ species: newSpecies, breed: '' });
    setBreedSearch('');
    setIsSpeciesOpen(false);
    setIsBreedOpen(false);
  };

  const availableBreeds = useMemo(() => {
    return searchBreedsBySpecies(currentPet.species, breedSearch);
  }, [currentPet.species, breedSearch]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    updateCurrentPet({
      photoFile: file,
      photoPreview: URL.createObjectURL(file),
    });
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCurrentPet({ photoFile: null, photoPreview: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    let createdCount = 0;

    if (hasPet) {
      const validPets = pets.filter(p => p.name.trim().length > 0);
      if (validPets.length === 0) {
        toast.error('Informe o nome de pelo menos um pet para continuar.');
        setIsSubmitting(false);
        return;
      }

      for (let i = 0; i < validPets.length; i++) {
        const pet = validPets[i];
        try {
          let photoUrl: string | undefined = undefined;

          if (pet.photoFile) {
            try {
              const formData = new FormData();
              formData.append('file', pet.photoFile);
              const uploadRes = await api.post('/upload/pet', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              photoUrl = uploadRes.data?.url;
            } catch (uploadErr) {
              console.warn('Falha no upload da imagem do pet:', uploadErr);
            }
          }

          const petPayload: any = {
            name: pet.name.trim(),
            species: pet.species,
            breed: pet.breed?.trim() || undefined,
            gender: pet.gender === 'UNKNOWN' ? undefined : pet.gender,
            birthDate: pet.ageMode === 'exact' && pet.birthDate ? pet.birthDate : undefined,
            approximateAge: pet.ageMode === 'approximate' && pet.approximateAge ? pet.approximateAge : undefined,
            weight: !pet.weightUnknown && pet.weight ? parseFloat(pet.weight.replace(',', '.')) : undefined,
            isNeutered: pet.isNeutered === null ? undefined : pet.isNeutered,
            vaccinationStatus: pet.vaccinationStatus,
            specialCareNotes: pet.specialCareNotes?.trim() || undefined,
            photo: photoUrl,
          };

          await api.post('/pets', petPayload);
          createdCount++;
        } catch (err) {
          console.error('Falha ao cadastrar pet #' + (i + 1) + ':', err);
        }
      }
    }

    if (createdCount > 0) {
      toast.success(
        createdCount === 1 
          ? 'Pet cadastrado com sucesso! Bem-vindo ao PetHub!' 
          : `${createdCount} pets cadastrados com sucesso! Bem-vindo ao PetHub!`
      );
    } else {
      toast.success('Bem-vindo ao PetHub!');
    }

    navigate('/tutor');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-neutral-900 font-sans">
      {/* Background Image & Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen" />
      
      {/* Main Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl my-2"
      >
        <div className="backdrop-blur-2xl bg-neutral-900/85 border border-white/20 p-6 sm:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
            <AnimatePresence mode="wait">
              {/* STEP 0: Mandatory CPF Confirmation (if Tutor doesn't have CPF yet) */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 text-center py-2"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
                    <ShieldCheck size={32} className="text-white" />
                  </div>
                  
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Confirmação de CPF do Tutor</h1>
                    <p className="text-white/70 text-sm max-w-md mx-auto">
                      Para emitir pedidos, gerenciar agendamentos e garantir a segurança da sua conta, informe seu CPF de tutor.
                    </p>
                  </div>

                  <form onSubmit={handleCpfSubmit} className="space-y-4 max-w-sm mx-auto text-left">
                    <div>
                      <label className="block text-xs font-semibold text-white/90 mb-1.5">
                        CPF do Tutor *
                      </label>
                      <input
                        type="text"
                        value={tutorCpf}
                        onChange={(e) => {
                          setTutorCpf(formatCPF(e.target.value));
                          if (cpfError) setCpfError(null);
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm placeholder-white/40"
                      />
                      {cpfError && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{cpfError}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingCpf || !tutorCpf}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {isSavingCpf ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Validando...
                        </>
                      ) : (
                        <>
                          Confirmar CPF e prosseguir
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* STEP 1: Welcome & Pet Question */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center py-2"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-6 transform rotate-3">
                    <Dog size={40} className="text-white -rotate-3" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Que bom ter você aqui!</h1>
                  <p className="text-white/70 mb-8 text-base">Para personalizarmos sua experiência, conte-nos: você já tem um pet?</p>

                  <div className="space-y-4 max-w-lg mx-auto">
                    <button
                      type="button"
                      onClick={() => { setHasPet(true); setStep(2); }}
                      className="w-full group relative overflow-hidden rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-5 transition-all flex items-center gap-4 cursor-pointer text-left shadow-lg hover:border-orange-400/50"
                    >
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0 border border-orange-400/30">
                        <Dog className="text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">Sim, eu tenho!</p>
                        <p className="text-xs text-white/60">Quero cadastrar meus pets agora</p>
                      </div>
                      <ChevronRight className="text-white/40 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { setHasPet(false); handleFinish(); }}
                      className="w-full group relative overflow-hidden rounded-2xl bg-transparent hover:bg-white/5 border border-white/15 p-5 transition-all flex items-center gap-4 cursor-pointer text-left"
                    >
                      <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <X className="text-white/60" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">Ainda não tenho</p>
                        <p className="text-xs text-white/60">Estou apenas conhecendo a plataforma</p>
                      </div>
                      <ArrowRight className="text-white/40 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: How many pets do you have? */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="py-2"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Quantos pets você possui?</h2>
                      <p className="text-white/60 text-sm">Vamos preparar o espaço ideal para cada um deles</p>
                    </div>
                  </div>

                  <div className="py-6 text-center">
                    <p className="text-xs uppercase tracking-wider font-bold text-orange-400 mb-3">Selecione a quantidade</p>
                    
                    {/* Quick Pill Selector */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePetCountChange(num)}
                          className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                            petCount === num
                              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105 border-2 border-orange-400'
                              : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                          }`}
                        >
                          {num} {num === 1 ? 'Pet' : 'Pets'}
                        </button>
                      ))}
                    </div>

                    {/* Stepper Counter */}
                    <div className="inline-flex items-center gap-4 bg-white/10 border border-white/15 px-6 py-3.5 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => handlePetCountChange(petCount - 1)}
                        disabled={petCount <= 1}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-lg font-bold flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <div className="min-w-20 text-center">
                        <span className="text-3xl font-extrabold text-white">{petCount}</span>
                        <span className="text-xs block text-white/60 font-medium">{petCount === 1 ? 'amigão' : 'amigões'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePetCountChange(petCount + 1)}
                        disabled={petCount >= 10}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-lg font-bold flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-xs text-white/50 mt-4">
                      Você cadastrará as informações de {petCount} {petCount === 1 ? 'pet' : 'pets'} na próxima etapa.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePetIndex(0);
                      setStep(3);
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    Continuar para cadastro dos pets
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {/* STEP 3: Complete Pet Details Forms */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => setStep(2)} 
                        className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                          <PawPrint size={20} className="text-orange-400 shrink-0" />
                          Pet {activePetIndex + 1} de {petCount}
                        </h2>
                        <p className="text-white/60 text-xs sm:text-sm">
                          {currentPet.name.trim() ? `Dados de ${currentPet.name}` : 'Preencha os dados completos do seu animal'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1 bg-white/10 text-orange-400 rounded-full border border-white/10">
                      {activePetIndex + 1}/{petCount}
                    </span>
                  </div>

                  {/* Multiple Pets Tabs Bar (if petCount > 1) */}
                  {petCount > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                      {pets.map((p, idx) => {
                        const isCurrent = idx === activePetIndex;
                        const hasName = p.name.trim().length > 0;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActivePetIndex(idx);
                              setIsSpeciesOpen(false);
                              setIsBreedOpen(false);
                              setBreedSearch('');
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                              isCurrent
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 border border-orange-400'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
                            }`}
                          >
                            <PawPrint size={13} className="shrink-0" />
                            <span>{p.name.trim() || `Pet ${idx + 1}`}</span>
                            {hasName && <Check size={12} className={isCurrent ? 'text-white' : 'text-emerald-400'} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Photo Upload */}
                  <div className="flex flex-col items-center justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative group cursor-pointer"
                      title="Clique para escolher uma foto do seu pet"
                    >
                      <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-orange-500 group-hover:bg-white/20 relative shadow-inner">
                        {currentPet.photoPreview ? (
                          <img
                            src={currentPet.photoPreview}
                            alt="Preview do pet"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <Camera className="text-white/50 mb-1 group-hover:text-white transition-colors" size={22} />
                            <span className="text-[11px] text-white/50 font-medium group-hover:text-white transition-colors">Foto</span>
                          </>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-orange-500 hover:bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                        <Plus size={14} />
                      </div>
                    </div>
                    {currentPet.photoPreview ? (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="mt-1 text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Remover foto
                      </button>
                    ) : (
                      <p className="text-[10px] text-white/40 mt-1">Opcional • JPG, PNG ou WEBP</p>
                    )}
                  </div>

                  {/* ================= SECTION 1: Identificação Básica ================= */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                      <PawPrint size={14} />
                      <span>1. Identificação Básica</span>
                    </div>

                    {/* Pet Name */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">Nome do pet *</label>
                      <input 
                        type="text" 
                        value={currentPet.name}
                        onChange={(e) => updateCurrentPet({ name: e.target.value })}
                        className="w-full bg-neutral-800/90 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 placeholder-white/30 transition-all text-sm"
                        placeholder="Ex: Thor, Mel, Luna, Bob..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Species Selector */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-white/80 mb-1.5">
                          Espécie *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSpeciesOpen(!isSpeciesOpen);
                            setIsBreedOpen(false);
                          }}
                          className="w-full h-[46px] px-3.5 bg-neutral-800/90 border border-white/15 rounded-xl flex items-center justify-between text-white hover:border-orange-400 transition-all text-left text-sm cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium truncate">
                            <SpeciesIcon speciesId={currentPet.species} size={18} className="text-orange-400 shrink-0" />
                            <span className="truncate">{getSpeciesInfo(currentPet.species).label}</span>
                          </span>
                          <div className="shrink-0 ml-2 text-white/50 pointer-events-none">
                            {isSpeciesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isSpeciesOpen && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setIsSpeciesOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-800 border border-white/20 rounded-xl shadow-2xl z-40 overflow-hidden py-1 max-h-56 overflow-y-auto"
                              >
                                {SPECIES_OPTIONS.map((opt) => {
                                  const isSelected = normalizeSpecies(currentPet.species) === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleSpeciesSelect(opt.id)}
                                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'hover:bg-white/10 text-white/90'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <SpeciesIcon speciesId={opt.id} size={16} className={isSelected ? "text-orange-400 shrink-0" : "text-orange-400/80 shrink-0"} />
                                        <span className="truncate">{opt.label}</span>
                                      </span>
                                      {isSelected && <Check size={16} className="text-orange-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Smart Searchable Breed Combobox */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-white/80 mb-1.5">
                          Raça * <span className="text-[10px] font-normal text-white/50">(ou SRD)</span>
                        </label>
                        <div className="relative flex items-center w-full">
                          <input 
                            type="text" 
                            value={isBreedOpen ? breedSearch : currentPet.breed}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBreedSearch(val);
                              updateCurrentPet({ breed: val });
                              if (!isBreedOpen) setIsBreedOpen(true);
                            }}
                            onFocus={() => {
                              setBreedSearch(currentPet.breed);
                              setIsBreedOpen(true);
                              setIsSpeciesOpen(false);
                            }}
                            placeholder="Buscar ou digitar raça..."
                            className="w-full h-[46px] px-3.5 pr-10 bg-neutral-800/90 border border-white/15 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 placeholder-white/30 transition-all text-sm"
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 shrink-0">
                            <Search size={16} />
                          </div>
                        </div>

                        <AnimatePresence>
                          {isBreedOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => {
                                  setIsBreedOpen(false);
                                  if (breedSearch && !currentPet.breed) {
                                    updateCurrentPet({ breed: breedSearch });
                                  }
                                }}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-800 border border-white/20 rounded-xl shadow-2xl z-40 overflow-hidden py-1 max-h-56 overflow-y-auto"
                              >
                                {availableBreeds.length === 0 ? (
                                  <div className="p-3 text-center">
                                    <p className="text-xs text-white/50 mb-1">Nenhuma raça catalogada</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateCurrentPet({ breed: breedSearch });
                                        setIsBreedOpen(false);
                                      }}
                                      className="text-xs text-orange-400 hover:underline font-semibold cursor-pointer"
                                    >
                                      Usar "{breedSearch}" mesmo assim
                                    </button>
                                  </div>
                                ) : (
                                  availableBreeds.map((bName) => {
                                    const isSelected = currentPet.breed === bName;
                                    return (
                                      <button
                                        key={bName}
                                        type="button"
                                        onClick={() => {
                                          updateCurrentPet({ breed: bName });
                                          setBreedSearch(bName);
                                          setIsBreedOpen(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                                          isSelected ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'hover:bg-white/10 text-white/90'
                                        }`}
                                      >
                                        <span>{bName}</span>
                                        {isSelected && <Check size={14} className="text-orange-400" />}
                                      </button>
                                    );
                                  })
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Gender Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Sexo do pet
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'MALE', label: 'Macho' },
                          { id: 'FEMALE', label: 'Fêmea' },
                          { id: 'UNKNOWN', label: 'Não sei' },
                        ].map((g) => {
                          const isSelected = currentPet.gender === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => updateCurrentPet({ gender: g.id as any })}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-400 shadow-xs'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ================= SECTION 2: Idade e Porte ================= */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                      <Calendar size={14} />
                      <span>2. Idade e Porte Físico</span>
                    </div>

                    {/* Age Mode Tabs */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Idade do animal
                      </label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { id: 'exact', label: 'Data exata' },
                          { id: 'approximate', label: 'Aproximada' },
                          { id: 'unknown', label: 'Não sei' },
                        ].map((tab) => {
                          const isSelected = currentPet.ageMode === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => updateCurrentPet({ ageMode: tab.id as any })}
                              className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-400 shadow-xs'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Exact Date Input */}
                      {currentPet.ageMode === 'exact' && (
                        <div className="relative">
                          <input
                            type="date"
                            max={todayStr}
                            value={currentPet.birthDate}
                            onChange={(e) => updateCurrentPet({ birthDate: e.target.value })}
                            className="w-full bg-neutral-800/90 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
                          />
                        </div>
                      )}

                      {/* Approximate Select */}
                      {currentPet.ageMode === 'approximate' && (
                        <div>
                          <select
                            value={currentPet.approximateAge}
                            onChange={(e) => updateCurrentPet({ approximateAge: e.target.value })}
                            className="w-full bg-neutral-800 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm cursor-pointer"
                          >
                            <option value="">Selecione a faixa etária aproximada...</option>
                            {getApproximateAgeOptions(currentPet.species).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Unknown Notice */}
                      {currentPet.ageMode === 'unknown' && (
                        <p className="text-xs text-white/60 bg-white/5 border border-white/10 p-3 rounded-xl">
                          Tudo bem! O veterinário ou profissional poderá estimar a idade durante a primeira avaliação.
                        </p>
                      )}
                    </div>

                    {/* Weight Field with 'Não sei' option */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                          <Weight size={13} />
                          <span>Peso aproximado (kg)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextUnknown = !currentPet.weightUnknown;
                            updateCurrentPet({ 
                              weightUnknown: nextUnknown, 
                              weight: nextUnknown ? '' : currentPet.weight 
                            });
                          }}
                          className={`text-xs font-semibold transition-colors cursor-pointer px-2 py-0.5 rounded-lg border ${
                            currentPet.weightUnknown 
                              ? 'text-orange-400 border-orange-500/50 bg-orange-500/10' 
                              : 'text-white/60 border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {currentPet.weightUnknown ? '✓ Não sei o peso (selecionado)' : 'Não sei o peso'}
                        </button>
                      </div>

                      {!currentPet.weightUnknown ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={currentPet.weight}
                            onChange={(e) => updateCurrentPet({ weight: e.target.value })}
                            placeholder="Ex: 10.5"
                            className="w-full bg-neutral-800/90 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-white/60 bg-white/5 border border-white/10 p-3 rounded-xl">
                          Peso marcado como não informado. Poderá ser pesado na balança da clínica ou pet shop.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ================= SECTION 3: Saúde e Cuidados ================= */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                      <Heart size={14} />
                      <span>3. Saúde e Cuidados</span>
                    </div>

                    {/* Castration */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                        <Scissors size={13} />
                        <span>O pet é castrado?</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: true, label: 'Sim, castrado' },
                          { val: false, label: 'Não castrado' },
                          { val: null, label: 'Não sei' },
                        ].map((opt, idx) => {
                          const isSelected = currentPet.isNeutered === opt.val;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateCurrentPet({ isNeutered: opt.val })}
                              className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-400 shadow-xs'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vaccination Status */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                        <Activity size={13} />
                        <span>Situação vacinal</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'UP_TO_DATE', label: 'Em dia' },
                          { id: 'PENDING', label: 'Atrasada' },
                          { id: 'UNKNOWN', label: 'Não sei' },
                        ].map((v) => {
                          const isSelected = currentPet.vaccinationStatus === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => updateCurrentPet({ vaccinationStatus: v.id as any })}
                              className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-400 shadow-xs'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {v.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special Care Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Cuidados especiais ou observações (opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={currentPet.specialCareNotes}
                        onChange={(e) => updateCurrentPet({ specialCareNotes: e.target.value })}
                        placeholder="Alergias, medicamentos contínuos, temperamento tímido/bravo..."
                        className="w-full bg-neutral-800/90 border border-white/15 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-xs placeholder-white/30 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    {activePetIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePetIndex(prev => prev - 1);
                          setIsSpeciesOpen(false);
                          setIsBreedOpen(false);
                          setBreedSearch('');
                        }}
                        className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ArrowLeft size={16} /> Voltar
                      </button>
                    )}

                    {activePetIndex < petCount - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentPet.name.trim()) {
                            toast.error('Informe o nome deste pet para avançar.');
                            return;
                          }
                          setActivePetIndex(prev => prev + 1);
                          setIsSpeciesOpen(false);
                          setIsBreedOpen(false);
                          setBreedSearch('');
                        }}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                      >
                        Próximo Pet (Pet {activePetIndex + 2} de {petCount})
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinish}
                        disabled={!currentPet.name.trim() || isSubmitting}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Cadastrando {petCount} {petCount === 1 ? 'pet' : 'pets'}...
                          </>
                        ) : (
                          <>
                            Concluir cadastro e entrar
                            <Check size={18} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
