import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Camera, ChevronDown, ChevronUp, Search, ArrowLeft, UploadCloud, X, Check, Calendar, Heart, ShieldAlert, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import { usePetStore } from '@/store/petStore';
import { Input, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const SPECIES_OPTIONS = [
  { id: 'dog', label: 'Cachorro', emoji: '🐶' },
  { id: 'cat', label: 'Gato', emoji: '🐱' },
  { id: 'bird', label: 'Ave', emoji: '🦜' },
  { id: 'rabbit', label: 'Coelho', emoji: '🐰' },
  { id: 'rodent', label: 'Roedor', emoji: '🐹' },
  { id: 'fish', label: 'Peixe', emoji: '🐠' },
  { id: 'reptile', label: 'Réptil', emoji: '🦎' },
  { id: 'other', label: 'Outro', emoji: '🐾' },
];

const COMMON_BREEDS: Record<string, string[]> = {
  dog: [
    'SRD (Sem Raça Definida)',
    'Akita',
    'Beagle',
    'Bernese Mountain Dog',
    'Bichon Frisé',
    'Border Collie',
    'Boston Terrier',
    'Boxer',
    'Buldogue Francês',
    'Buldogue Inglês',
    'Bull Terrier',
    'Cane Corso',
    'Cavalier King Charles',
    'Chihuahua',
    'Chow Chow',
    'Cocker Spaniel',
    'Dachshund (Salsicha)',
    'Dálmata',
    'Doberman',
    'Dogo Argentino',
    'Golden Retriever',
    'Husky Siberiano',
    'Jack Russell Terrier',
    'Labrador Retriever',
    'Lhasa Apso',
    'Lulu da Pomerânia (Spitz Alemão)',
    'Maltês',
    'Mastiff',
    'Pastor Alemão',
    'Pastor Australiano',
    'Pastor Belga Malinois',
    'Pastor Suíço',
    'Pinscher',
    'Pitbull (American Pit Bull Terrier)',
    'Poodle',
    'Pug',
    'Rottweiler',
    'Samoieda',
    'Schnauzer',
    'Shar Pei',
    'Shih Tzu',
    'Staffordshire Bull Terrier',
    'Weimaraner',
    'Whippet',
    'Yorkshire Terrier',
  ],
  cat: [
    'SRD (Sem Raça Definida)',
    'Abissínio',
    'American Shorthair',
    'Angorá Turco',
    'Azul Russo',
    'Bengal',
    'Birmanês (Sagrado da Birmânia)',
    'British Shorthair',
    'Chartreux',
    'Cornish Rex',
    'Devon Rex',
    'Exótico',
    'Himalaio',
    'Maine Coon',
    'Munchkin',
    'Norueguês da Floresta',
    'Persa',
    'Ragdoll',
    'Savannah',
    'Scottish Fold',
    'Siamês',
    'Siberiano',
    'Sphynx',
    'Tonquês',
  ],
  bird: [
    'Calopsita',
    'Canário',
    'Periquito Australiano',
    'Papagaio Verdadeiro',
    'Agapornis',
    'Cacatua',
    'Caturrita',
    'Manon',
    'Outra Raça / Espécie',
  ],
  rabbit: [
    'Mini Lion',
    'Mini Lop',
    'Holandês',
    'Flemish Giant',
    'Rex',
    'Cabeça de Leão',
    'Outra Raça',
  ],
  rodent: [
    'Hamster Sírio',
    'Hamster Anão Russo',
    'Porquinho da Índia',
    'Chinchila',
    'Gerbil',
    'Rato Twister',
    'Outro',
  ],
};

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

interface PetFormPageProps {
  isEditing?: boolean;
}

export default function PetFormPage({ isEditing = false }: PetFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { createPet, updatePet, pets } = usePetStore();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  
  // Birth date vs Approximate age mode
  const [ageType, setAgeType] = useState<'exact' | 'approximate'>('exact');
  const [birthDate, setBirthDate] = useState('');
  const [approximateAge, setApproximateAge] = useState('');

  // Vaccination status
  const [vaccinationStatus, setVaccinationStatus] = useState<'UP_TO_DATE' | 'PENDING' | 'UNKNOWN'>('UNKNOWN');

  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSpeciesOpen, setIsSpeciesOpen] = useState(false);
  const [isBreedOpen, setIsBreedOpen] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Load existing pet if editing
  useEffect(() => {
    if ((isEditing || id) && id) {
      const existing = pets.find(p => p.id === id);
      if (existing) {
        setName(existing.name || '');
        setSpecies(existing.species || 'dog');
        setBreed(existing.breed || '');
        setGender((existing as any).gender || 'MALE');
        
        if (existing.birthDate) {
          setAgeType('exact');
          setBirthDate(new Date(existing.birthDate).toISOString().split('T')[0]);
        } else if ((existing as any).approximateAge) {
          setAgeType('approximate');
          setApproximateAge((existing as any).approximateAge);
        }

        if ((existing as any).vaccinationStatus) {
          setVaccinationStatus((existing as any).vaccinationStatus);
        }

        if (existing.weight) setWeight(String(existing.weight));
        if ((existing as any).notes) setNotes((existing as any).notes);
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
        toast.error('Formato inválido. Use JPG, PNG ou WebP.');
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

  const breedList = useMemo(() => {
    return COMMON_BREEDS[species] || ['Outra'];
  }, [species]);

  const filteredBreeds = useMemo(() => {
    const search = breedSearch.toLowerCase().trim();
    if (!search) return breedList;
    return breedList.filter(b => b.toLowerCase().includes(search));
  }, [breedList, breedSearch]);

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
    if (!breed.trim()) {
      toast.error('Selecione ou informe a raça.');
      return;
    }

    // Date validation
    if (ageType === 'exact' && birthDate) {
      if (birthDate > todayStr) {
        toast.error('A data de nascimento não pode ser no futuro.');
        return;
      }
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
          console.error('Photo upload failed, continuing with fallback:', uploadErr);
        }
      }

      const payload = {
        name: name.trim(),
        species,
        breed: breed.trim(),
        gender,
        birthDate: ageType === 'exact' && birthDate ? new Date(birthDate).toISOString() : null,
        approximateAge: ageType === 'approximate' && approximateAge ? approximateAge.trim() : null,
        vaccinationStatus,
        weight: weight ? parseFloat(weight.replace(',', '.')) : null,
        notes: notes.trim() || null,
        photo: finalPhotoUrl || null,
      };

      if (id) {
        await updatePet(id, payload as any);
        toast.success('Pet atualizado com sucesso!');
      } else {
        await createPet(payload as any);
        toast.success('Pet cadastrado com sucesso!');
      }

      navigate('/tutor/pets');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Erro ao salvar pet';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/tutor/pets')}
        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-medium text-sm">Voltar para Meus Pets</span>
      </button>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
          {id ? 'Editar Pet' : 'Cadastrar Novo Pet'}
        </h1>
        <p className="text-neutral-500 mt-1">
          {id ? 'Atualize as informações do seu amigão' : 'Preencha os dados do seu amigão para começar'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={handlePhotoClick}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-all group overflow-hidden shadow-inner"
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
              <div className="flex flex-col items-center text-neutral-400 group-hover:text-orange-500 transition-colors">
                <UploadCloud size={32} />
                <span className="text-xs font-semibold mt-1">Adicionar foto</span>
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
          <p className="text-xs text-neutral-400">JPG, PNG ou WebP (Máx. 10MB)</p>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
            Informações Principais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Pet *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Thor, Mel, Luna..."
              required
            />

            {/* Species Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Espécie *</label>
              <button
                type="button"
                onClick={() => setIsSpeciesOpen(!isSpeciesOpen)}
                className="w-full h-[42px] px-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-left"
              >
                <span className="text-neutral-800 text-sm font-medium">
                  {SPECIES_OPTIONS.find(s => s.id === species)?.emoji} {SPECIES_OPTIONS.find(s => s.id === species)?.label}
                </span>
                {isSpeciesOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </button>

              <AnimatePresence>
                {isSpeciesOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsSpeciesOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-neutral-100 z-30 overflow-hidden py-1 max-h-56 overflow-y-auto"
                    >
                      {SPECIES_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSpecies(opt.id);
                            setBreed('');
                            setBreedSearch('');
                            setIsSpeciesOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                            species === opt.id ? 'bg-orange-50 text-orange-600 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{opt.emoji}</span> {opt.label}
                          </span>
                          {species === opt.id && <Check size={16} className="text-orange-500" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Searchable Breed Combobox */}
          <div className="relative">
            <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
              Raça * <span className="text-xs font-normal text-neutral-400">(pesquisável)</span>
            </label>
            <div className="relative w-full">
              <input
                type="text"
                value={isBreedOpen ? breedSearch : breed}
                onChange={(e) => {
                  setBreedSearch(e.target.value);
                  setBreed(e.target.value);
                  if (!isBreedOpen) setIsBreedOpen(true);
                }}
                onFocus={() => {
                  setBreedSearch(breed);
                  setIsBreedOpen(true);
                }}
                placeholder="🔍 Digite para pesquisar ou escolha na lista..."
                className="w-full h-[42px] px-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-10 text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                <Search size={16} />
              </div>
            </div>

            <AnimatePresence>
              {isBreedOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => {
                      setIsBreedOpen(false);
                      if (breedSearch && !breed) setBreed(breedSearch);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-neutral-100 z-30 overflow-hidden py-1 max-h-64 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-50 border-b border-neutral-100">
                      Raças de {SPECIES_OPTIONS.find(s => s.id === species)?.label} ({filteredBreeds.length})
                    </div>
                    {filteredBreeds.length === 0 ? (
                      <div className="p-3 text-center text-sm text-neutral-500">
                        <p>Nenhuma raça encontrada.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBreed(breedSearch || 'SRD');
                            setIsBreedOpen(false);
                          }}
                          className="mt-1 text-xs text-orange-500 font-semibold hover:underline"
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
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                            breed === b ? 'bg-orange-50 text-orange-600 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <span>{b}</span>
                          {breed === b && <Check size={16} className="text-orange-500" />}
                        </button>
                      ))
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Sexo *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('MALE')}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  gender === 'MALE'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <span>♂️ Macho</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('FEMALE')}
                className={`p-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  gender === 'FEMALE'
                    ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <span>♀️ Fêmea</span>
              </button>
            </div>
          </div>
        </div>

        {/* Age & Birth Date Section */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="text-base font-bold text-neutral-900">
              Idade / Nascimento
            </h2>
            <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAgeType('exact')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ageType === 'exact' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Data exata
              </button>
              <button
                type="button"
                onClick={() => setAgeType('approximate')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ageType === 'approximate' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Idade aproximada
              </button>
            </div>
          </div>

          {ageType === 'exact' ? (
            <div>
              <Input
                label="Data de Nascimento (não pode ser futura) *"
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
                hint="Selecione a data de nascimento do seu pet"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-neutral-900">
                Selecione ou digite a idade aproximada *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {APPROXIMATE_AGE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setApproximateAge(opt)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      approximateAge === opt
                        ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold shadow-xs'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <Input
                label="Ou digite outra idade aproximada"
                value={approximateAge}
                onChange={(e) => setApproximateAge(e.target.value)}
                placeholder="Ex: 2 anos e 4 meses, cerca de 5 anos..."
              />
            </div>
          )}
        </div>

        {/* Vaccination Status Section */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
            Status das Vacinas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setVaccinationStatus('UP_TO_DATE')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                vaccinationStatus === 'UP_TO_DATE'
                  ? 'border-green-500 bg-green-50/60 text-green-800 shadow-xs'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">✅</span>
                {vaccinationStatus === 'UP_TO_DATE' && <Check size={16} className="text-green-600" />}
              </div>
              <div className="mt-2">
                <p className="font-bold text-sm">Vacinas em dia</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Todas as doses aplicadas</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setVaccinationStatus('PENDING')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                vaccinationStatus === 'PENDING'
                  ? 'border-amber-500 bg-amber-50/60 text-amber-800 shadow-xs'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">⚠️</span>
                {vaccinationStatus === 'PENDING' && <Check size={16} className="text-amber-600" />}
              </div>
              <div className="mt-2">
                <p className="font-bold text-sm">Vacinas pendentes</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Faltam doses ou reforços</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setVaccinationStatus('UNKNOWN')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                vaccinationStatus === 'UNKNOWN'
                  ? 'border-blue-500 bg-blue-50/60 text-blue-800 shadow-xs'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">❓</span>
                {vaccinationStatus === 'UNKNOWN' && <Check size={16} className="text-blue-600" />}
              </div>
              <div className="mt-2">
                <p className="font-bold text-sm">Não sei informar</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Precisa de avaliação</p>
              </div>
            </button>
          </div>

          {vaccinationStatus === 'UNKNOWN' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900"
            >
              <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-blue-900 text-sm">Não sabe se as vacinas do seu pet estão em dia?</p>
                <p className="mt-1 text-blue-800 leading-relaxed">
                  Recomendamos agendar uma consulta com um médico veterinário ou clínica para avaliar a caderneta e histórico de vacinação do seu pet, garantindo a proteção dele contra doenças graves.
                </p>
                <div className="mt-2.5">
                  <Link
                    to="/tutor/explore"
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    Explorar clínicas e veterinários no PetHub →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
            Outros Detalhes (Opcional)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Peso aproximado (kg)"
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 12.5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Observações ou cuidados especiais</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Alérgico a frango, dócil com crianças, toma medicação X..."
              className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            {id ? 'Salvar Alterações' : 'Cadastrar Pet 🐾'}
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
