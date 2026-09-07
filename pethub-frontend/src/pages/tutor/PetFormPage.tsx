import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Camera, ChevronDown, ChevronUp, Search, ArrowLeft, UploadCloud, 
  X, Check, Calendar, Heart, ShieldAlert, Sparkles, HelpCircle, 
  AlertCircle, Plus, Trash2, Weight, Info, ShieldCheck, Activity, Stethoscope,
  Tag, Scale, Scissors, CheckCircle2, AlertTriangle, PawPrint, Syringe
} from 'lucide-react';
import { usePetStore } from '@/store/petStore';
import { Input, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  SPECIES_OPTIONS, 
  COMMON_BREEDS, 
  searchBreedsBySpecies, 
  normalizeSpecies, 
  getSpeciesInfo 
} from '@/utils/species';

const APPROXIMATE_AGE_OPTIONS = [
  'Filhote (menos de 6 meses)',
  'Jovem (6 meses a 1 ano)',
  'Aproximadamente 1 ano',
  'Aproximadamente 2 anos',
  'Aproximadamente 3 anos',
  'Aproximadamente 4 anos',
  'Aproximadamente 5 anos',
  'Adulto (6 a 8 anos)',
  'Sênior (9 a 12 anos)',
  'Idoso (mais de 12 anos)',
];

const COMMON_VACCINE_SUGGESTIONS: Record<string, string[]> = {
  dog: ['V10 (Décupla)', 'V8 (Óctupla)', 'Antirrábica', 'Gripe Canina (Pneumodog)', 'Giárdia'],
  cat: ['V4 (Quádrupla Felina)', 'V5 (Quíntupla Felina)', 'Antirrábica'],
  rabbit: ['Mixomatose', 'Doença Hemorrágica Viral (VHD)'],
  other: ['Antirrábica', 'Polivalente'],
};

interface VaccineEntry {
  name: string;
  date: string;
}

interface PetFormPageProps {
  isEditing?: boolean;
}

export default function PetFormPage({ isEditing = false }: PetFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { createPet, updatePet, pets } = usePetStore();

  // Seção 1: Identificação
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('dog');
  const [breed, setBreed] = useState('');
  const [isSpeciesOpen, setIsSpeciesOpen] = useState(false);
  const [isBreedOpen, setIsBreedOpen] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');

  // Seção 2: Informações Físicas
  const [ageMode, setAgeMode] = useState<'exact' | 'approximate' | 'unknown'>('exact');
  const [birthDate, setBirthDate] = useState('');
  const [approximateAge, setApproximateAge] = useState('');
  const [weightUnknown, setWeightUnknown] = useState(false);
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('MALE');
  const [isNeutered, setIsNeutered] = useState<boolean | null>(null); // true, false, null

  // Seção 3: Saúde e Vacinação
  const [vaccinationStatus, setVaccinationStatus] = useState<'UP_TO_DATE' | 'PENDING' | 'UNCERTAIN' | 'UNKNOWN'>('UNKNOWN');
  const [vaccinesList, setVaccinesList] = useState<VaccineEntry[]>([]);
  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');

  // Seção 4: Comportamento
  const [behaviorNotes, setBehaviorNotes] = useState('');

  // Seção 5: Condições e Cuidados Especiais
  const [specialCareNotes, setSpecialCareNotes] = useState('');

  // Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Load existing pet if editing
  useEffect(() => {
    if ((isEditing || id) && id) {
      const existing = pets.find(p => p.id === id);
      if (existing) {
        setName(existing.name || '');
        setSpecies(normalizeSpecies(existing.species) || 'dog');
        setBreed(existing.breed || '');
        
        // Gender
        if (existing.gender === 'MALE' || (existing as any).gender === 'Macho') setGender('MALE');
        else if (existing.gender === 'FEMALE' || (existing as any).gender === 'Fêmea') setGender('FEMALE');
        else setGender('UNKNOWN');

        // Neutered
        if (existing.isNeutered === true) setIsNeutered(true);
        else if (existing.isNeutered === false) setIsNeutered(false);
        else setIsNeutered(null);

        // Age / BirthDate
        if (existing.birthDate) {
          setAgeMode('exact');
          setBirthDate(new Date(existing.birthDate).toISOString().split('T')[0]);
        } else if (existing.approximateAge) {
          setAgeMode('approximate');
          setApproximateAge(existing.approximateAge);
        } else {
          setAgeMode('unknown');
        }

        // Vaccination status
        if (existing.vaccinationStatus) {
          const v = existing.vaccinationStatus.toUpperCase();
          if (v.includes('UP_TO_DATE') || v.includes('EM DIA')) setVaccinationStatus('UP_TO_DATE');
          else if (v.includes('PENDING') || v.includes('ATRASAD')) setVaccinationStatus('PENDING');
          else if (v.includes('UNCERTAIN') || v.includes('CERTEZA')) setVaccinationStatus('UNCERTAIN');
          else setVaccinationStatus('UNKNOWN');
        }

        // Vaccines list
        if (Array.isArray(existing.vaccines)) {
          setVaccinesList(existing.vaccines.map((v: any) => ({
            name: v.name || '',
            date: v.date ? new Date(v.date).toISOString().split('T')[0] : ''
          })));
        }

        // Weight
        if (existing.weight !== undefined && existing.weight !== null) {
          setWeight(String(existing.weight));
          setWeightUnknown(false);
        } else {
          setWeight('');
          setWeightUnknown(true);
        }

        // Notes / Care / Behavior
        if (existing.behaviorNotes) setBehaviorNotes(existing.behaviorNotes);
        if (existing.specialCareNotes) setSpecialCareNotes(existing.specialCareNotes);
        else if (existing.notes) setSpecialCareNotes(existing.notes);

        if (existing.photo) {
          setExistingPhoto(existing.photo);
          setPhotoPreview(existing.photo);
        }
      }
    }
  }, [id, isEditing, pets]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Formato de imagem inválido. Use JPG, PNG ou WebP.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 10MB.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Changing species clears breed and search query immediately
  const handleSpeciesSelect = (newSpeciesId: string) => {
    setSpecies(newSpeciesId);
    setBreed('');
    setBreedSearch('');
    setIsSpeciesOpen(false);
    setIsBreedOpen(false);
  };

  // Filtered breeds strictly for current species
  const filteredBreeds = useMemo(() => {
    return searchBreedsBySpecies(species, breedSearch);
  }, [species, breedSearch]);

  // Filtered species list
  const filteredSpeciesOptions = useMemo(() => {
    if (!speciesSearch.trim()) return SPECIES_OPTIONS;
    const q = speciesSearch.toLowerCase();
    return SPECIES_OPTIONS.filter(s => s.label.toLowerCase().includes(q));
  }, [speciesSearch]);

  const handleAddVaccine = () => {
    if (!newVacName.trim()) {
      toast.error('Informe o nome da vacina.');
      return;
    }
    if (newVacDate && newVacDate > todayStr) {
      toast.error('A data da aplicação não pode ser no futuro.');
      return;
    }

    setVaccinesList(prev => [...prev, { name: newVacName.trim(), date: newVacDate }]);
    setNewVacName('');
    setNewVacDate('');
  };

  const handleRemoveVaccine = (index: number) => {
    setVaccinesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddVaccine = (vacName: string) => {
    if (!vaccinesList.some(v => v.name.toLowerCase() === vacName.toLowerCase())) {
      setVaccinesList(prev => [...prev, { name: vacName, date: '' }]);
    }
  };

  const currentSpeciesInfo = useMemo(() => getSpeciesInfo(species), [species]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do pet.');
      return;
    }
    if (!species) {
      toast.error('Selecione a espécie.');
      return;
    }

    // Date validation
    if (ageMode === 'exact' && birthDate) {
      if (birthDate > todayStr) {
        toast.error('A data de nascimento não pode ser no futuro.');
        return;
      }
    }

    // Weight validation
    let parsedWeight: number | null = null;
    if (!weightUnknown && weight.trim()) {
      const num = parseFloat(weight.replace(',', '.'));
      if (isNaN(num) || num <= 0) {
        toast.error('Informe um peso válido maior que zero (ex: 8.5 kg).');
        return;
      }
      if (num > 500) {
        toast.error('Por favor, informe um peso plausível.');
        return;
      }
      parsedWeight = num;
    }

    setIsLoading(true);
    try {
      let finalPhotoUrl = existingPhoto || '';

      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append('file', photoFile);
          const uploadRes = await api.post('/upload/pet', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          finalPhotoUrl = uploadRes.data.url;
        } catch (uploadErr) {
          console.error('Photo upload failed, continuing without custom photo:', uploadErr);
        }
      }

      const payload = {
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        gender: gender === 'UNKNOWN' ? null : gender,
        birthDate: ageMode === 'exact' && birthDate ? new Date(birthDate).toISOString() : null,
        approximateAge: ageMode === 'approximate' && approximateAge ? approximateAge.trim() : null,
        vaccinationStatus,
        weight: parsedWeight,
        isNeutered,
        behaviorNotes: behaviorNotes.trim() || null,
        specialCareNotes: specialCareNotes.trim() || null,
        notes: specialCareNotes.trim() || null,
        vaccines: vaccinesList.map(v => ({
          name: v.name.trim(),
          date: v.date ? new Date(v.date).toISOString() : null,
        })),
        photo: finalPhotoUrl || null,
      };

      if (id) {
        await updatePet(id, payload as any);
        toast.success('Perfil do pet atualizado com sucesso!');
      } else {
        await createPet(payload as any);
        toast.success('Pet cadastrado com sucesso!');
      }

      navigate('/tutor/pets');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Erro ao salvar informações do pet';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 pb-24 text-neutral-900 dark:text-[#E3E3E3]">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/tutor/pets')}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:text-[#8E918F] dark:hover:text-[#E3E3E3] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Voltar para Meus Pets</span>
        </button>
        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold">
          {id ? 'Edição' : 'Novo Cadastro'}
        </span>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {id ? 'Editar Perfil do Pet' : 'Cadastrar Pet'}
        </h1>
        <p className="text-neutral-500 dark:text-[#8E918F] mt-1 text-sm">
          Informações completas e estruturadas para o melhor atendimento e segurança do seu pet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Card */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm flex flex-col items-center gap-3">
          <div
            onClick={handlePhotoClick}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-neutral-100 dark:bg-[#2A2B2D] border-2 border-dashed border-neutral-300 dark:border-[#444746] flex items-center justify-center cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-all group overflow-hidden shadow-inner"
            title="Clique para escolher foto"
          >
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera size={22} />
                  <span className="text-xs font-semibold mt-1">Trocar foto</span>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-md z-10"
                  title="Remover foto"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-neutral-400 dark:text-[#8E918F] group-hover:text-orange-500 transition-colors">
                <UploadCloud size={32} />
                <span className="text-xs font-semibold mt-1">Foto do pet</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
            />
          </div>
          <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Opcional • JPG, PNG ou WebP (Máx. 10MB)</p>
        </div>

        {/* ============================================================ */}
        {/* SEÇÃO 1 — IDENTIFICAÇÃO */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
            <Tag size={20} className="text-orange-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                1. Identificação
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Dados essenciais do animal</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <Input
              label="Nome do Pet *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Thor, Mel, Luna..."
              required
            />

            {/* Espécie & Raça Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Espécie Custom Select with perfect non-clipped chevron */}
              <div className="relative">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                  Espécie *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsSpeciesOpen(!isSpeciesOpen);
                    setIsBreedOpen(false);
                  }}
                  className="w-full h-[46px] px-3.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl flex items-center justify-between hover:border-orange-400 dark:hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-left transition-all"
                >
                  <span className="text-neutral-800 dark:text-[#E3E3E3] text-sm font-medium truncate flex items-center gap-2">
                    <PawPrint size={16} className="text-orange-500 shrink-0" />
                    <span>{currentSpeciesInfo.label}</span>
                  </span>
                  <div className="shrink-0 ml-2 text-neutral-400 dark:text-[#8E918F]">
                    {isSpeciesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isSpeciesOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSpeciesOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1E1F20] rounded-xl shadow-2xl border border-neutral-200 dark:border-[#313335] z-50 overflow-hidden py-1 max-h-64 flex flex-col"
                      >
                        {/* Search inside species dropdown if many species */}
                        <div className="p-2 border-b border-neutral-100 dark:border-[#313335]">
                          <div className="relative flex items-center">
                            <Search size={14} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                            <input
                              type="text"
                              value={speciesSearch}
                              onChange={(e) => setSpeciesSearch(e.target.value)}
                              placeholder="Filtrar espécies..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-[#2A2B2D] border border-neutral-200 dark:border-[#313335] rounded-lg focus:outline-none focus:border-orange-500 text-neutral-800 dark:text-[#E3E3E3]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        <div className="overflow-y-auto max-h-52">
                          {filteredSpeciesOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSpeciesSelect(opt.id)}
                              className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                                species === opt.id
                                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold'
                                  : 'hover:bg-neutral-50 dark:hover:bg-[#2A2B2D] text-neutral-700 dark:text-[#C4C7C5]'
                              }`}
                            >
                              <span className="flex items-center gap-2.5 truncate">
                                <PawPrint size={15} className="text-neutral-400 shrink-0" />
                                <span>{opt.label}</span>
                              </span>
                              {species === opt.id && <Check size={16} className="text-orange-500 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Searchable Breed Combobox with clean magnifier and full visibility */}
              <div className="relative">
                <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                  Raça <span className="text-xs font-normal text-neutral-400 dark:text-[#8E918F]">(filtrada por {currentSpeciesInfo.label})</span>
                </label>
                <div className="relative flex items-center w-full">
                  {/* Left Magnifier icon - always fully visible */}
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-[#8E918F] shrink-0">
                    <Search size={18} />
                  </div>

                  <input
                    type="text"
                    value={isBreedOpen ? breedSearch : (breed || '')}
                    onChange={(e) => {
                      setBreedSearch(e.target.value);
                      setBreed(e.target.value);
                      if (!isBreedOpen) setIsBreedOpen(true);
                    }}
                    onFocus={() => {
                      setBreedSearch(breed || '');
                      setIsBreedOpen(true);
                      setIsSpeciesOpen(false);
                    }}
                    placeholder={`Pesquise raças de ${currentSpeciesInfo.label}...`}
                    className="w-full h-[46px] pl-10 pr-10 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F] transition-all"
                  />

                  {/* Right controls: clear or toggle dropdown */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {breed && (
                      <button
                        type="button"
                        onClick={() => {
                          setBreed('');
                          setBreedSearch('');
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E3E3E3] p-0.5"
                        title="Limpar raça"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBreedOpen(!isBreedOpen)}
                      className="text-neutral-400 dark:text-[#8E918F] p-0.5"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isBreedOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setIsBreedOpen(false);
                          if (breedSearch && !breed) setBreed(breedSearch);
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1E1F20] rounded-xl shadow-2xl border border-neutral-200 dark:border-[#313335] z-50 overflow-hidden py-1 max-h-64 overflow-y-auto"
                      >
                        <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8E918F] bg-neutral-50 dark:bg-[#2A2B2D] border-b border-neutral-100 dark:border-[#313335]">
                          Raças compatíveis ({filteredBreeds.length})
                        </div>
                        {filteredBreeds.length === 0 ? (
                          <div className="p-3 text-center text-sm text-neutral-500 dark:text-[#8E918F]">
                            <p>Nenhuma raça padrão encontrada.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setBreed(breedSearch || 'SRD (Sem Raça Definida)');
                                setIsBreedOpen(false);
                              }}
                              className="mt-1.5 text-xs text-orange-500 font-semibold hover:underline block mx-auto"
                            >
                              Usar "{breedSearch}" como raça personalizada
                            </button>
                          </div>
                        ) : (
                          filteredBreeds.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                setBreed(b);
                                setBreedSearch('');
                                setIsBreedOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                                breed === b
                                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold'
                                  : 'hover:bg-neutral-50 dark:hover:bg-[#2A2B2D] text-neutral-700 dark:text-[#C4C7C5]'
                              }`}
                            >
                              <span className="truncate">{b}</span>
                              {breed === b && <Check size={16} className="text-orange-500 shrink-0" />}
                            </button>
                          ))
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEÇÃO 2 — INFORMAÇÕES FÍSICAS */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
            <Scale size={20} className="text-orange-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                2. Informações Físicas
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Idade, peso, sexo e castração</p>
            </div>
          </div>

          {/* Idade / Nascimento Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                Idade / Data de Nascimento
              </label>
              <div className="flex bg-neutral-100 dark:bg-[#2A2B2D] p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAgeMode('exact')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ageMode === 'exact' 
                      ? 'bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3] shadow-xs' 
                      : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800'
                  }`}
                >
                  Data exata
                </button>
                <button
                  type="button"
                  onClick={() => setAgeMode('approximate')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ageMode === 'approximate' 
                      ? 'bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3] shadow-xs' 
                      : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800'
                  }`}
                >
                  Idade aproximada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgeMode('unknown');
                    setBirthDate('');
                    setApproximateAge('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ageMode === 'unknown' 
                      ? 'bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3] shadow-xs' 
                      : 'text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800'
                  }`}
                >
                  Não sei
                </button>
              </div>
            </div>

            {ageMode === 'exact' && (
              <div>
                <Input
                  label="Data de Nascimento (não pode ser futura)"
                  type="date"
                  max={todayStr}
                  value={birthDate}
                  onChange={(e) => {
                    if (e.target.value > todayStr) {
                      toast.error('A data de nascimento não pode ser no futuro.');
                      return;
                    }
                    setBirthDate(e.target.value);
                  }}
                  leftIcon={<Calendar size={16} />}
                />
              </div>
            )}

            {ageMode === 'approximate' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {APPROXIMATE_AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setApproximateAge(opt)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        approximateAge === opt
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-semibold shadow-xs'
                          : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  label="Ou especifique outra idade aproximada"
                  value={approximateAge}
                  onChange={(e) => setApproximateAge(e.target.value)}
                  placeholder="Ex: 4 anos, cerca de 18 meses..."
                />
              </div>
            )}

            {ageMode === 'unknown' && (
              <div className="p-3 bg-neutral-50 dark:bg-[#2A2B2D] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs text-neutral-500 dark:text-[#8E918F] flex items-center gap-2">
                <Info size={16} className="text-neutral-400 shrink-0" />
                <span>Idade desconhecida ou não informada. Não criamos datas fictícias.</span>
              </div>
            )}
          </div>

          {/* Peso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                Peso do Pet
              </label>
              <button
                type="button"
                onClick={() => {
                  setWeightUnknown(!weightUnknown);
                  if (!weightUnknown) setWeight('');
                }}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all inline-flex items-center gap-1.5 ${
                  weightUnknown
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-500 dark:text-[#8E918F]'
                }`}
              >
                {weightUnknown && <Check size={13} className="stroke-[3]" />}
                {weightUnknown ? 'Não informado' : 'Marcar como não informado'}
              </button>
            </div>

            {!weightUnknown && (
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 8.5"
                  className="w-full h-[46px] px-3.5 pr-12 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm text-neutral-900 dark:text-[#E3E3E3]"
                />
                <span className="absolute right-3.5 text-xs font-bold text-neutral-400 dark:text-[#8E918F]">
                  kg
                </span>
              </div>
            )}
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
              Sexo
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setGender('MALE')}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  gender === 'MALE'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">M</span> Macho</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('FEMALE')}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  gender === 'FEMALE'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">F</span> Fêmea</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('UNKNOWN')}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  gender === 'UNKNOWN'
                    ? 'border-neutral-400 bg-neutral-100 dark:bg-[#2A2B2D] text-neutral-800 dark:text-[#E3E3E3] font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-500 dark:text-[#8E918F] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><HelpCircle size={15} className="text-neutral-400" /> Não informado</span>
              </button>
            </div>
          </div>

          {/* Castrado/a */}
          <div>
            <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
              Castrado/a?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIsNeutered(true)}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-1.5 transition-all ${
                  isNeutered === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><Scissors size={15} className="text-emerald-500" /> Sim</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNeutered(false)}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-1.5 transition-all ${
                  isNeutered === false
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><X size={15} className="text-neutral-400" /> Não</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNeutered(null)}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-1.5 transition-all ${
                  isNeutered === null
                    ? 'border-neutral-400 bg-neutral-100 dark:bg-[#2A2B2D] text-neutral-800 dark:text-[#E3E3E3] font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-500 dark:text-[#8E918F] hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center gap-1.5"><HelpCircle size={15} className="text-neutral-400" /> Não sei</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEÇÃO 3 — SAÚDE E VACINAÇÃO */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
            <Syringe size={20} className="text-orange-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                3. Saúde e Vacinação
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Status geral e vacinas conhecidas</p>
            </div>
          </div>

          {/* Pergunta do Status */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">
              Você sabe se o pet está com as vacinas em dia?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setVaccinationStatus('UP_TO_DATE')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  vaccinationStatus === 'UP_TO_DATE'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Sim, vacinas em dia</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">Todas as doses aplicadas</p>
                </div>
                {vaccinationStatus === 'UP_TO_DATE' && <Check size={18} className="text-emerald-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setVaccinationStatus('UNCERTAIN')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  vaccinationStatus === 'UNCERTAIN'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Não tenho certeza</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">Precisa verificar carteirinha</p>
                </div>
                {vaccinationStatus === 'UNCERTAIN' && <Check size={18} className="text-amber-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setVaccinationStatus('PENDING')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  vaccinationStatus === 'PENDING'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Não, está atrasado</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">Necessita reforço ou novas doses</p>
                </div>
                {vaccinationStatus === 'PENDING' && <Check size={18} className="text-rose-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setVaccinationStatus('UNKNOWN')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  vaccinationStatus === 'UNKNOWN'
                    ? 'border-neutral-400 bg-neutral-100 dark:bg-[#2A2B2D] text-neutral-900 dark:text-[#E3E3E3] shadow-xs'
                    : 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <HelpCircle size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Não sei / nunca acompanhei</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">Precisa de avaliação inicial</p>
                </div>
                {vaccinationStatus === 'UNKNOWN' && <Check size={18} className="text-neutral-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Detalhamento de Múltiplas Vacinas */}
          <div className="pt-2 border-t border-neutral-100 dark:border-[#313335] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                  Vacinas conhecidas registradas ({vaccinesList.length})
                </label>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                  Adicione as vacinas que você conhece ou tem na caderneta.
                </p>
              </div>
            </div>

            {/* Quick Suggestions based on species */}
            {COMMON_VACCINE_SUGGESTIONS[species] && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-neutral-400 dark:text-[#8E918F]">Sugestões:</span>
                {COMMON_VACCINE_SUGGESTIONS[species].map((vac) => (
                  <button
                    key={vac}
                    type="button"
                    onClick={() => handleQuickAddVaccine(vac)}
                    className="text-xs px-2.5 py-1 bg-neutral-100 hover:bg-orange-50 hover:text-orange-600 dark:bg-[#2A2B2D] dark:hover:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5] rounded-lg transition-colors border border-neutral-200 dark:border-[#313335]"
                  >
                    + {vac}
                  </button>
                ))}
              </div>
            )}

            {/* Registered Vaccines List */}
            {vaccinesList.length > 0 ? (
              <div className="space-y-2">
                {vaccinesList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-[#2A2B2D] border border-neutral-200 dark:border-[#313335] text-sm"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{item.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                        {item.date ? `Aplicada em: ${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Data não informada'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVaccine(idx)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                      title="Remover vacina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-[#8E918F] italic">
                Nenhuma vacina individual detalhada ainda (opcional).
              </p>
            )}

            {/* Add New Vaccine Form */}
            <div className="p-3.5 rounded-xl border border-dashed border-neutral-300 dark:border-[#444746] bg-neutral-50/50 dark:bg-[#2A2B2D]/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-[#8E918F] flex items-center gap-1.5">
                <Plus size={14} /> Adicionar Vacina
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newVacName}
                  onChange={(e) => setNewVacName(e.target.value)}
                  placeholder="Nome da vacina (ex: V10, Antirrábica)"
                  className="w-full h-[40px] px-3 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <input
                  type="date"
                  max={todayStr}
                  value={newVacDate}
                  onChange={(e) => setNewVacDate(e.target.value)}
                  className="w-full h-[40px] px-3 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  title="Data da aplicação (opcional)"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVaccine}
                className="w-full text-xs"
              >
                Salvar Vacina na Lista
              </Button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEÇÃO 4 — INFORMAÇÕES COMPORTAMENTAIS */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
            <PawPrint size={20} className="text-orange-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                4. Informações Comportamentais
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Útil para profissionais durante banho, tosa e atendimento</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
              Observações comportamentais
            </label>
            <textarea
              value={behaviorNotes}
              onChange={(e) => setBehaviorNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Fica nervoso durante o banho, medo de secador, sensibilidade nas patas traseiras, dócil com crianças..."
              className="w-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] rounded-xl px-4 py-3 text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
              Observações não constituem laudo médico e são compartilhadas com profissionais apenas durante atendimentos agendados.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEÇÃO 5 — CONDIÇÕES E RESTRIÇÕES */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-5 md:p-6 border border-neutral-200 dark:border-[#313335] shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-[#313335] pb-3">
            <ShieldCheck size={20} className="text-orange-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                5. Condições e Restrições
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Alergias, cuidados especiais e restrições informadas</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
              Informações importantes para atendimento
            </label>
            <textarea
              value={specialCareNotes}
              onChange={(e) => setSpecialCareNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Alérgico a produtos com fragrância, restrição a petiscos com frango, uso de colírio diário..."
              className="w-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] rounded-xl px-4 py-3 text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
              Informações protegidas. Apenas estabelecimentos com agendamentos ativos possuem autorização para visualizá-las.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            {id ? 'Salvar Alterações' : 'Cadastrar Pet'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate('/tutor/pets')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
