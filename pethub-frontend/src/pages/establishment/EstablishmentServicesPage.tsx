import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Users,
  Check,
  Upload,
  Scissors,
  PawPrint,
  Settings2,
  AlertCircle,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';
import { Input, Button, Modal, Badge } from '@/components/ui';
import { ServiceLogo } from '@/components/shared/ServiceLogo';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import {
  SPECIES_OPTIONS,
  getSpeciesInfo,
  normalizeSpecies,
  getSpeciesCategory,
  isPetCompatibleWithService,
} from '@/utils/species';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  image: string | null;
  category: string | null;
  animalType: string | null;
  employees?: { employee: { id: string; name: string; role?: string } }[];
}

const getFullImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const SPECIES_CATEGORIES = [
  { id: 'dog_cat', label: 'Cães & Gatos', ids: ['dog', 'cat'] },
  { id: 'birds', label: 'Aves', ids: ['cockatiel', 'parrot', 'parakeet', 'canary', 'lovebird'] },
  { id: 'small_mammals', label: 'Coelhos & Roedores', ids: ['rabbit', 'hamster', 'guinea_pig', 'ferret', 'rat', 'hedgehog'] },
  { id: 'reptiles', label: 'Répteis & Anfíbios', ids: ['turtle', 'iguana', 'gecko', 'snake'] },
  { id: 'others', label: 'Peixes & Outros', ids: ['fish', 'other'] },
];

const getCategoryLabel = (category?: string) => {
  switch (category) {
    case 'dog': return 'Canino';
    case 'cat': return 'Felino';
    case 'bird': return 'Ave';
    case 'rabbit': return 'Coelho';
    case 'rodent': return 'Roedor';
    case 'reptile': return 'Réptil';
    case 'fish': return 'Peixe';
    default: return 'Outros';
  }
};

const getDisplaySpeciesInfo = (spKey: string) => {
  const norm = normalizeSpecies(spKey);
  const info = getSpeciesInfo(spKey);
  if (norm === 'other' && spKey.trim().toLowerCase() !== 'other') {
    return {
      id: spKey,
      label: spKey,
      emoji: '🐾',
      category: 'other',
    };
  }
  return {
    ...info,
    category: getSpeciesCategory(spKey),
  };
};

export default function EstablishmentServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Attended Species State
  const [attendedSpecies, setAttendedSpecies] = useState<string[]>([]);
  const [acceptedSpeciesProfile, setAcceptedSpeciesProfile] = useState<string[]>([]);
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState<string>('all');

  // Manage Species Modal
  const [manageSpeciesModalOpen, setManageSpeciesModalOpen] = useState(false);
  const [selectedModalSpecies, setSelectedModalSpecies] = useState<string[]>([]);
  const [customSpeciesInput, setCustomSpeciesInput] = useState('');
  const [savingSpecies, setSavingSpecies] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('Banho e tosa');
  const [animalType, setAnimalType] = useState('all');
  const [isCustomAnimalType, setIsCustomAnimalType] = useState(false);
  const [customAnimalTypeVal, setCustomAnimalTypeVal] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // File Upload State
  const serviceFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const toast = useToast();

  const handleServiceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData);
      if (res.data?.url) {
        setImage(res.data.url);
        toast.success('Foto do serviço carregada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploadingPhoto(false);
      if (serviceFileRef.current) serviceFileRef.current.value = '';
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const [servicesRes, empRes, speciesRes] = await Promise.all([
        api.get('/establishment/services'),
        api.get('/establishment/employees'),
        api.get('/establishment/species'),
      ]);

      setServices(servicesRes.data || []);
      setEmployees(empRes.data || []);

      const spData = speciesRes.data || {};
      const profileList: string[] = Array.isArray(spData.acceptedSpecies) ? spData.acceptedSpecies : [];
      const fullList: string[] = Array.isArray(spData.attendedSpecies) ? spData.attendedSpecies : profileList;

      setAcceptedSpeciesProfile(profileList);
      setAttendedSpecies(fullList);
    } catch (err) {
      console.error('Error fetching services and species:', err);
      toast.error('Erro ao carregar dados de serviços e espécies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('30');
    setImage('');
    setCategory('Banho e tosa');
    setAnimalType('all');
    setIsCustomAnimalType(false);
    setCustomAnimalTypeVal('');
    setSelectedEmployeeIds([]);
    setModalOpen(true);
  };

  const openEditModal = (s: ServiceItem) => {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description || '');
    setPrice(String(s.price));
    setDuration(String(s.duration));
    setImage(s.image || '');
    setCategory(s.category || 'Banho e tosa');

    const existingType = s.animalType || 'all';
    const isStandardOption = existingType === 'all' || SPECIES_OPTIONS.some(o => o.id === existingType);
    if (!isStandardOption && existingType.trim()) {
      setIsCustomAnimalType(true);
      setCustomAnimalTypeVal(existingType);
      setAnimalType(existingType);
    } else {
      setIsCustomAnimalType(false);
      setCustomAnimalTypeVal('');
      setAnimalType(existingType);
    }

    setSelectedEmployeeIds(s.employees?.map(e => e.employee.id) || []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do serviço é obrigatório.');
      return;
    }
    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Informe um preço válido.');
      return;
    }
    const numDuration = parseInt(duration, 10);
    if (isNaN(numDuration) || numDuration <= 0) {
      toast.error('Informe uma duração válida em minutos.');
      return;
    }

    const finalAnimalType = isCustomAnimalType
      ? customAnimalTypeVal.trim() || 'all'
      : animalType;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: numPrice,
        duration: numDuration,
        image: image || undefined,
        category,
        animalType: finalAnimalType,
        employeeIds: selectedEmployeeIds,
      };

      if (editingId) {
        await api.put(`/establishment/services/${editingId}`, payload);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await api.post('/establishment/services', payload);
        toast.success('Serviço cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar serviço.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await api.delete(`/establishment/services/${id}`);
      toast.success('Serviço removido.');
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover serviço.');
    }
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleToggleModalSpecies = (speciesId: string) => {
    setSelectedModalSpecies(prev => {
      if (prev.includes(speciesId)) {
        return prev.filter(s => s !== speciesId);
      } else {
        return [...prev, speciesId];
      }
    });
  };

  const handleAddCustomSpecies = () => {
    const trimmed = customSpeciesInput.trim();
    if (!trimmed) return;
    if (selectedModalSpecies.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error('Este tipo de animal já está na lista.');
      return;
    }
    setSelectedModalSpecies(prev => [...prev, trimmed]);
    setCustomSpeciesInput('');
  };

  const handleRemoveCustomSpecies = (nameToRemove: string) => {
    setSelectedModalSpecies(prev => prev.filter(s => s !== nameToRemove));
  };

  const handleSaveSpecies = async () => {
    if (selectedModalSpecies.length === 0) {
      toast.error('Selecione pelo menos um tipo de animal atendido.');
      return;
    }

    setSavingSpecies(true);
    try {
      await api.put('/establishment/species', {
        acceptedSpecies: selectedModalSpecies,
      });
      toast.success('Tipos de animais atendidos atualizados com sucesso!');
      setManageSpeciesModalOpen(false);
      await fetchServices();
    } catch (err: any) {
      console.error('Error saving species:', err);
      toast.error(err.response?.data?.error || 'Erro ao salvar tipos de animais.');
    } finally {
      setSavingSpecies(false);
    }
  };

  // Filtered services
  const filteredServices = services.filter((s) => {
    if (selectedSpeciesFilter === 'all') return true;
    return isPetCompatibleWithService(selectedSpeciesFilter, s.animalType);
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Serviços Oferecidos</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
            Cadastre e gerencie os serviços disponíveis para agendamento pelos tutores
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          leftIcon={<Plus size={16} />}
          className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs whitespace-nowrap cursor-pointer"
        >
          Cadastrar serviço
        </Button>
      </div>

      {/* 1. SEÇÃO DE TIPOS DE ANIMAIS ATENDIDOS */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-[#313335]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100/70 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <PawPrint size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">Tipos de Animais Atendidos</h2>
                {attendedSpecies.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30">
                    {attendedSpecies.length} {attendedSpecies.length === 1 ? 'tipo atendido' : 'tipos atendidos'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                Espécies que seu estabelecimento tem capacidade técnica e estrutura homologada para receber
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Settings2 size={14} />}
            onClick={() => {
              setSelectedModalSpecies([...acceptedSpeciesProfile]);
              setCustomSpeciesInput('');
              setManageSpeciesModalOpen(true);
            }}
            className="text-xs shrink-0 cursor-pointer"
          >
            Gerenciar animais atendidos
          </Button>
        </div>

        {attendedSpecies.length === 0 ? (
          <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Nenhum tipo de animal configurado</h4>
                <p className="text-xs text-neutral-600 dark:text-[#8E918F] mt-0.5">
                  Seu estabelecimento ainda não cadastrou quais espécies atende. Configure para que os tutores encontrem seus serviços na busca e agendem apenas para pets compatíveis.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedModalSpecies([]);
                setCustomSpeciesInput('');
                setManageSpeciesModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs cursor-pointer"
            >
              Configurar espécies agora
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {attendedSpecies.map((spKey) => {
                const info = getDisplaySpeciesInfo(spKey);
                const isSelected = selectedSpeciesFilter === spKey;
                const serviceCount = services.filter(s => isPetCompatibleWithService(spKey, s.animalType)).length;

                return (
                  <button
                    key={spKey}
                    type="button"
                    onClick={() => setSelectedSpeciesFilter(prev => prev === spKey ? 'all' : spKey)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 shadow-xs ring-1 ring-orange-500'
                        : 'bg-neutral-50/60 dark:bg-[#282A2C]/60 hover:bg-neutral-100/80 dark:hover:bg-[#282A2C] border-neutral-200/80 dark:border-[#313335]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <SpeciesIcon
                          speciesId={spKey}
                          size="sm"
                          className={isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-700 dark:text-[#C4C7C5]'}
                        />
                        <span className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">
                          {info.label || spKey}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#8E918F]">
                      <span className="uppercase font-semibold tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-[#313335]">
                        {getCategoryLabel(info.category)}
                      </span>
                      <span className="font-medium text-neutral-600 dark:text-[#C4C7C5]">
                        {serviceCount} {serviceCount === 1 ? 'serviço' : 'serviços'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Filter Info Bar */}
            {selectedSpeciesFilter !== 'all' && (
              <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-orange-50/70 dark:bg-orange-950/20 rounded-xl border border-orange-200/60 dark:border-orange-900/30">
                <span className="text-orange-800 dark:text-orange-300 font-medium">
                  Exibindo serviços compatíveis com: <strong className="font-bold">{getDisplaySpeciesInfo(selectedSpeciesFilter).label || selectedSpeciesFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSpeciesFilter('all')}
                  className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                >
                  Limpar filtro (Ver todos)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SERVICES LIST */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F]">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando serviços e animais atendidos...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335]">
          <Wrench size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">Nenhum serviço cadastrado</h3>
          <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-md mx-auto mb-4">
            Cadastre banhos, tosas, consultas e outros serviços para que os tutores possam agendar online.
          </p>
          <Button onClick={openCreateModal} leftIcon={<Plus size={16} />} className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap cursor-pointer">
            Cadastrar serviço
          </Button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335]">
          <PawPrint size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
          <h4 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-sm mb-1">
            Nenhum serviço específico para {getDisplaySpeciesInfo(selectedSpeciesFilter).label}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-[#8E918F] max-w-sm mx-auto mb-4">
            Não foram encontrados serviços dedicados a esta espécie. Você pode cadastrar um serviço novo ou desativar o filtro.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedSpeciesFilter('all')}>
              Ver todos os serviços
            </Button>
            <Button size="sm" onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
              Cadastrar serviço para esta espécie
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((s) => {
            const isAllSpecies = !s.animalType || ['all', 'todos', 'ambos', 'qualquer', 'todas'].includes(s.animalType.toLowerCase());
            const spInfo = getDisplaySpeciesInfo(s.animalType || 'all');

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] overflow-hidden shadow-xs flex flex-col group hover:shadow-sm transition-all"
              >
                {/* Service Image */}
                <div className="h-44 bg-neutral-100 dark:bg-[#282A2C] relative overflow-hidden flex items-center justify-center">
                  {s.image ? (
                    <img
                      src={getFullImageUrl(s.image)}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100/70 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <Scissors size={24} />
                      </div>
                      <span className="text-[11px] font-semibold tracking-wide">Sem foto</span>
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      {s.duration} min
                    </span>
                    <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs">
                      R$ {s.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Service Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded truncate">
                        {s.category || 'Geral'}
                      </span>

                      {/* Dynamic Animal Species Badge */}
                      <span className="text-[11px] text-neutral-500 dark:text-[#8E918F] font-medium inline-flex items-center gap-1.5 shrink-0">
                        {isAllSpecies ? (
                          <>
                            <PawPrint size={12} className="text-orange-500" />
                            <span>Todas as espécies</span>
                          </>
                        ) : (
                          <>
                            <SpeciesIcon speciesId={s.animalType} size="xs" />
                            <span className="text-neutral-800 dark:text-[#C4C7C5] font-semibold">
                              {spInfo.label || s.animalType}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ServiceLogo category={s.category} name={s.name} size="sm" showBadge={true} />
                      <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">{s.name}</h3>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F] line-clamp-2 leading-relaxed">
                      {s.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Assigned employees */}
                  {s.employees && s.employees.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-[#313335] flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-[#8E918F]">
                      <Users size={12} className="text-neutral-400 dark:text-[#8E918F]" />
                      <span className="truncate">
                        Profissionais: {s.employees.map(e => e.employee.name).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex gap-2 justify-end">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] rounded-lg transition-colors cursor-pointer"
                      title="Editar serviço"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Excluir serviço"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL DE CADASTRO / EDIÇÃO DE SERVIÇO */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Editar Serviço' : 'Novo Serviço'}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Nome do Serviço *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Banho Completo com Hidratação"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço (R$) *"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="60,00"
                leftIcon={<DollarSign size={14} />}
                required
              />
              <Input
                label="Duração Estimada (minutos) *"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                leftIcon={<Clock size={14} />}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3]"
                >
                  <option value="Banho e tosa">Banho e tosa</option>
                  <option value="Veterinária">Veterinária</option>
                  <option value="Hospedagem & Creche">Hospedagem & Creche</option>
                  <option value="Adestramento">Adestramento</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                  Espécie / Tipo de Animal Atendido *
                </label>
                <select
                  value={isCustomAnimalType ? 'custom' : animalType}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomAnimalType(true);
                      setCustomAnimalTypeVal('');
                    } else {
                      setIsCustomAnimalType(false);
                      setAnimalType(val);
                    }
                  }}
                  className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3]"
                >
                  <option value="all">🐾 Todas as espécies atendidas pelo estabelecimento</option>

                  {attendedSpecies.length > 0 && (
                    <optgroup label="Espécies atendidas pelo seu estabelecimento">
                      {attendedSpecies.map((sp) => {
                        const spInfo = getDisplaySpeciesInfo(sp);
                        return (
                          <option key={sp} value={sp}>
                            Apenas {spInfo.label || sp}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}

                  <optgroup label="Outras opções do PetHub">
                    {SPECIES_OPTIONS.filter(opt => !attendedSpecies.includes(opt.id)).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        Apenas {opt.label}
                      </option>
                    ))}
                    <option value="custom">Outro tipo de animal (personalizado)...</option>
                  </optgroup>
                </select>

                {isCustomAnimalType && (
                  <div className="mt-2">
                    <Input
                      placeholder="Digite o animal (ex: Furão, Mini pig, Chinchila...)"
                      value={customAnimalTypeVal}
                      onChange={(e) => setCustomAnimalTypeVal(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Descreva as etapas do serviço, produtos utilizados, etc..."
                className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl p-2.5 text-xs text-neutral-800 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] resize-none"
              />
            </div>

            {/* Service Photo Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase">
                Foto do Serviço
              </label>
              <input
                ref={serviceFileRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleServiceFile}
              />
              {image ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335]">
                  <img src={getFullImageUrl(image)} alt="Preview do serviço" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => serviceFileRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-3 py-1.5 bg-white text-neutral-900 rounded-lg text-xs font-bold shadow hover:bg-neutral-100 cursor-pointer"
                    >
                      Substituir foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow hover:bg-red-700 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => serviceFileRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full border-2 border-dashed border-neutral-300 dark:border-[#313335] hover:border-orange-500 dark:hover:border-orange-500 bg-neutral-50 dark:bg-[#282A2C] hover:bg-orange-50/40 dark:hover:bg-orange-950/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-neutral-600 dark:text-[#C4C7C5] transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                    <Upload size={18} className={isUploadingPhoto ? 'animate-bounce' : ''} />
                  </div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3]">
                    {isUploadingPhoto ? 'Enviando imagem...' : 'Adicionar foto do serviço'}
                  </span>
                  <span className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                    Selecione do computador ou celular (PNG, JPG, WEBP)
                  </span>
                </button>
              )}
            </div>

            {/* Assign Employees */}
            {employees.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1.5">
                  Funcionários que realizam este serviço
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-1 bg-neutral-50 dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335]">
                  {employees.map((emp) => {
                    const selected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs cursor-pointer ${
                          selected ? 'bg-orange-500 text-white font-bold' : 'bg-white dark:bg-[#282A2C] hover:bg-neutral-100 dark:hover:bg-[#313335] text-neutral-800 dark:text-[#E3E3E3]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selected ? 'bg-white text-orange-500 border-white' : 'border-neutral-300 dark:border-[#313335]'
                        }`}>
                          {selected && <Check size={12} />}
                        </div>
                        <span className="truncate">{emp.name} ({emp.role})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving} className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                {editingId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. MODAL PARA GERENCIAR TIPOS DE ANIMAIS ATENDIDOS */}
      {manageSpeciesModalOpen && (
        <Modal
          isOpen={manageSpeciesModalOpen}
          onClose={() => setManageSpeciesModalOpen(false)}
          title="Gerenciar Tipos de Animais Atendidos"
          size="lg"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-xl border border-neutral-200/80 dark:border-[#313335] text-neutral-600 dark:text-[#8E918F] space-y-1">
              <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                Defina todas as espécies que seu estabelecimento está apto a receber.
              </p>
              <p>
                Os animais selecionados aqui determinam os filtros de busca para os tutores, a compatibilidade de agendamento e as opções de animais ao cadastrar serviços.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="font-bold text-neutral-800 dark:text-[#E3E3E3]">
                {selectedModalSpecies.length} {selectedModalSpecies.length === 1 ? 'espécie selecionada' : 'espécies selecionadas'}
              </span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedModalSpecies(SPECIES_OPTIONS.map(o => o.id))}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5] font-medium transition-colors cursor-pointer"
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModalSpecies(['dog', 'cat'])}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5] font-medium transition-colors cursor-pointer"
                >
                  Apenas Cães e Gatos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModalSpecies([])}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5] font-medium transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Species Categorized Groups */}
            <div className="space-y-4">
              {SPECIES_CATEGORIES.map((cat) => {
                const catOptions = SPECIES_OPTIONS.filter(o => cat.ids.includes(o.id));
                return (
                  <div key={cat.id} className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-[#8E918F]">
                      {cat.label}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {catOptions.map((opt) => {
                        const isSelected = selectedModalSpecies.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleModalSpecies(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 font-bold text-orange-600 dark:text-orange-400 shadow-xs'
                                : 'bg-white dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SpeciesIcon speciesId={opt.id} size="sm" className={isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-500'} />
                              <span className="truncate">{opt.label}</span>
                            </div>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Species Section */}
            <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-[#E3E3E3] mb-1">
                  Adicionar Outro Tipo de Animal Personalizado
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Furão, Mini pig, Chinchila, etc..."
                    value={customSpeciesInput}
                    onChange={(e) => setCustomSpeciesInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSpecies();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomSpecies}
                    disabled={!customSpeciesInput.trim()}
                    className="shrink-0 cursor-pointer"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Custom Tags */}
              {selectedModalSpecies.filter(s => !SPECIES_OPTIONS.some(o => o.id === s)).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-[#8E918F]">
                    Espécies personalizadas adicionadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedModalSpecies
                      .filter(s => !SPECIES_OPTIONS.some(o => o.id === s))
                      .map((customName) => (
                        <span
                          key={customName}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100/80 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-semibold text-xs border border-orange-200 dark:border-orange-900/40"
                        >
                          <SpeciesIcon speciesId={customName} size={14} className="shrink-0 text-orange-600 dark:text-orange-400" />
                          <span>{customName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomSpecies(customName)}
                            className="hover:text-red-500 cursor-pointer"
                            title="Remover"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
                * As alterações são salvas diretamente no perfil do estabelecimento.
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setManageSpeciesModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveSpecies}
                  isLoading={savingSpecies}
                  disabled={selectedModalSpecies.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                >
                  Salvar Espécies
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
