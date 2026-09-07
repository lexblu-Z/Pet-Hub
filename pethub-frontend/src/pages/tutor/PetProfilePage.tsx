import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Edit, PawPrint, Calendar, Syringe,
  ClipboardList, Stethoscope, Sparkles, AlertCircle, Weight,
  Hash, Heart, Plus, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Activity,
  Scissors, CalendarDays, Check
} from 'lucide-react';
import { api } from '@/services/api';
import { Badge, EmptyState } from '@/components/ui';
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

export default function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [pet, setPet] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        <div className="h-64 bg-neutral-100 dark:bg-[#1E1F20] rounded-3xl animate-pulse" />
        <div className="h-32 bg-neutral-100 dark:bg-[#1E1F20] rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-[#2A2B2D] flex items-center justify-center mx-auto mb-4 text-neutral-400"><PawPrint size={32} /></div>
        <p className="text-neutral-500 dark:text-[#8E918F] font-semibold">Pet não encontrado ou você não tem permissão para acessá-lo.</p>
        <button 
          onClick={() => navigate('/tutor/pets')} 
          className="mt-4 text-orange-500 font-bold hover:underline"
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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Hero Header */}
      <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden rounded-b-3xl">
        <img 
          src={pet.photo || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1200'} 
          alt={pet.name} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/tutor/pets')}
          className="absolute top-4 left-4 p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-xl text-white transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Edit button */}
        <Link
          to={`/tutor/pets/${pet.id}/editar`}
          className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-xl text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <Edit size={16} />
          <span>Editar Perfil</span>
        </Link>

        {/* Pet info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-[#313335] overflow-hidden shadow-2xl shrink-0 bg-neutral-800">
              <img 
                src={pet.photo || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=300'} 
                alt={pet.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 truncate">
                <PawPrint size={22} className="text-orange-400 shrink-0" />
                <span className="truncate">{pet.name}</span>
              </h1>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5 truncate">
                {pet.breed || 'Raça não informada'} • {speciesInfo.label} • {pet.birthDate ? getAge(pet.birthDate) : (pet.approximateAge || 'Idade não informada')}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pet.isNeutered === true && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/80 backdrop-blur-sm text-white text-[11px] rounded-full font-medium">
                    <span className="inline-flex items-center gap-1"><Scissors size={12} /> Castrado(a)</span>
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[11px] rounded-full font-medium">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> {vaccinationStatusFormatted.label}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-[#1E1F20] border-b border-neutral-100 dark:border-[#313335] sticky top-0 z-20 shadow-xs">
        <div className="flex overflow-x-auto scrollbar-hide px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-200 cursor-pointer',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800 dark:hover:text-[#E3E3E3]',
              ].join(' ')}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && (
                <span className="bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.2 font-bold ml-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
          </motion.div>
        )}

        {/* Vacinas Tab */}
        {activeTab === 'vacinas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
      </div>
    </div>
  );
}
