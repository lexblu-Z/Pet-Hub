import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Edit, PawPrint, Calendar, Syringe,
  ClipboardList, Stethoscope, Sparkles, AlertCircle, Weight,
  Hash, Heart, Plus
} from 'lucide-react';
import { api } from '@/services/api';
import { Badge, Tabs, EmptyState } from '@/components/ui';

const speciesEmoji: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', other: '🐾',
};

const speciesLabel: Record<string, string> = {
  dog: 'Cachorro', cat: 'Gato', bird: 'Pássaro', rabbit: 'Coelho', other: 'Outro',
};

const sexLabel: Record<string, string> = { male: 'Macho', female: 'Fêmea' };

const vaccineStatusConfig = {
  'up-to-date': { label: 'Em dia', variant: 'success' as const, icon: '✓' },
  upcoming: { label: 'Próxima', variant: 'warning' as const, icon: '⚠' },
  overdue: { label: 'Atrasada', variant: 'error' as const, icon: '!' },
};

function getAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  if (years === 0) return `${Math.max(1, now.getMonth() - birth.getMonth())} meses`;
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        <div className="h-64 bg-neutral-100 rounded-3xl animate-pulse" />
        <div className="h-32 bg-neutral-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="text-6xl mb-4">🐾</p>
        <p className="text-neutral-500 font-semibold">Pet não encontrado</p>
        <button onClick={() => navigate('/tutor/pets')} className="mt-4 text-orange-500 font-bold hover:underline">
          Voltar para Meus Pets
        </button>
      </div>
    );
  }

  const petVaccines: any[] = [];
  const petAppointments = appointments;
  const upToDate = 0;
  const overdue = 0;
  const upcoming = 0;

  const tabs = [
    { id: 'info', label: 'Informações', icon: '🐾' },
    { id: 'vacinas', label: 'Vacinas', icon: '💉', badge: overdue > 0 ? overdue : undefined },
    { id: 'historico', label: 'Histórico', icon: '📋' },
    { id: 'consultas', label: 'Consultas', icon: '🩺' },
    { id: 'servicos', label: 'Serviços', icon: '✦' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Header */}
      <div className="relative h-72 lg:h-80 overflow-hidden">
        <img src={pet.photo || '/fallback-dog.png'} alt={pet.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/tutor/pets')}
          className="absolute top-4 left-4 p-2.5 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-xl text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Edit button */}
        <Link
          to={`/tutor/pets/${pet.id}/editar`}
          className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-xl text-white transition-colors"
        >
          <Edit size={20} />
        </Link>

        {/* Pet info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-xl shrink-0">
              <img src={pet.photo || '/fallback-dog.png'} alt={pet.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {(speciesEmoji as any)[pet.species || "dog"]} {pet.name}
              </h1>
              <p className="text-white/70">{pet.breed || "Raça não informada"} · {pet.gender === "FEMALE" ? "Fêmea" : "Macho"} · {pet.birthDate ? getAge(pet.birthDate) : (pet.approximateAge || "Idade não informada")}</p>
              <div className="flex gap-2 mt-2">
                {pet.isNeutered && (
                  <span className="px-2 py-0.5 bg-blue-500/80 backdrop-blur-sm text-white text-xs rounded-full font-medium">
                    Castrado/a
                  </span>
                )}
                {overdue > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/80 backdrop-blur-sm text-white text-xs rounded-full font-medium">
                    ⚠ {overdue} vacina{overdue > 1 ? 's' : ''} atrasada{overdue > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-[#1E1F20] border-b border-neutral-100 dark:border-[#313335] sticky top-0 z-20">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 cursor-pointer',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-neutral-500 dark:text-[#C4C7C5] hover:text-neutral-700 dark:hover:text-[#E3E3E3]',
              ].join(' ')}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 text-center">
                <Weight size={20} className="mx-auto mb-2 text-orange-400" />
                <p className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">{pet.weight}kg</p>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Peso</p>
              </div>
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 text-center">
                <span className="block text-2xl mb-2">{(speciesEmoji as any)[pet.species || "dog"] || "🐾"}</span>
                <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">{(speciesLabel as any)[pet.species || "dog"] || pet.species}</p>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Espécie</p>
              </div>
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 text-center">
                <Calendar size={20} className="mx-auto mb-2 text-blue-400" />
                <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">{pet.birthDate ? getAge(pet.birthDate) : (pet.approximateAge || "—")}</p>
                <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Idade</p>
              </div>
            </div>

            {/* Main info */}
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 space-y-4">
              <h3 className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">Informações gerais</h3>
              {[
                { label: 'Espécie', value: (speciesLabel as any)[pet.species || "dog"] || pet.species },
                { label: 'Raça', value: pet.breed },
                { label: 'Sexo', value: pet.gender === "FEMALE" ? "Fêmea" : "Macho" },
                { label: 'Nascimento', value: pet.birthDate ? new Date(pet.birthDate).toLocaleDateString('pt-BR') : (pet.approximateAge || "Não informado") },
                { label: 'Peso', value: `${pet.weight} kg` },
                { label: 'Microchip', value: pet.microchip || 'Não registrado' },
                { label: 'Castrado/a', value: pet.isNeutered ? 'Sim' : 'Não' },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between py-2 border-b border-neutral-50 dark:border-[#313335] last:border-0">
                  <span className="text-sm text-neutral-500 dark:text-[#C4C7C5]">{item.label}</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-[#E3E3E3] text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {((pet.allergies && pet.allergies.length > 0) || (pet.medications && pet.medications.length > 0)) && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl p-5">
                <h3 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                  <AlertCircle size={18} /> Alertas importantes
                </h3>
                {(pet.allergies && pet.allergies.length > 0) && (
                  <div className="mb-3">
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium uppercase mb-2">Alergias</p>
                    <div className="flex flex-wrap gap-2">
                      {(pet.allergies || []).map((a) => (
                        <span key={a} className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-sm rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(pet.medications && pet.medications.length > 0) && (
                  <div>
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium uppercase mb-2">Medicamentos</p>
                    <div className="space-y-1">
                      {(pet.medications || []).map((m) => (
                        <p key={m} className="text-sm text-red-700 dark:text-red-300">• {m}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pet.notes && (
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5">
                <h3 className="font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-3">Observações</h3>
                <p className="text-neutral-600 dark:text-[#C4C7C5] text-sm">{pet.notes}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Vacinas Tab */}
        {activeTab === 'vacinas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-green-50 dark:bg-emerald-950/30 rounded-2xl p-4 text-center border border-green-100 dark:border-emerald-900/40">
                <p className="text-2xl font-bold text-green-700 dark:text-emerald-400">{upToDate}</p>
                <p className="text-xs text-green-600 dark:text-emerald-300 font-medium">Em dia</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 text-center border border-amber-100 dark:border-amber-900/40">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{upcoming}</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">Próximas</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 text-center border border-red-100 dark:border-red-900/40">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{overdue}</p>
                <p className="text-xs text-red-600 dark:text-red-300 font-medium">Atrasadas</p>
              </div>
            </div>

            {/* Overdue */}
            {overdue > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" /> Atrasadas
                </h3>
                <div className="space-y-2">
                  {petVaccines.filter((v) => v.status === 'overdue').map((v) => (
                    <div key={v.id} className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{v.name}</p>
                          {v.nextDueDate && <p className="text-sm text-red-500 dark:text-red-400">Venceu em {new Date(v.nextDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                          {v.veterinarian && <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-1">Dr. {v.veterinarian}</p>}
                        </div>
                        <Badge variant="error" dot>Atrasada</Badge>
                      </div>
                      <button className="mt-3 w-full py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 transition-colors font-medium">
                        Agendar urgentemente
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" /> Próximas (30 dias)
                </h3>
                <div className="space-y-2">
                  {petVaccines.filter((v) => v.status === 'upcoming').map((v) => (
                    <div key={v.id} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{v.name}</p>
                          {v.nextDueDate && <p className="text-sm text-amber-600 dark:text-amber-400">Vence em {new Date(v.nextDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <Badge variant="warning" dot>Próxima</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Up-to-date */}
            {upToDate > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-green-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 dark:bg-emerald-500 rounded-full" /> Em dia
                </h3>
                <div className="space-y-2">
                  {petVaccines.filter((v) => v.status === 'up-to-date').map((v) => (
                    <div key={v.id} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{v.name}</p>
                          {v.date && <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Aplicada em {new Date(v.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                          {v.nextDueDate && <p className="text-xs text-neutral-400 dark:text-[#8E918F]">Próxima: {new Date(v.nextDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <Badge variant="success">✓ Em dia</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="w-full py-3 border-2 border-dashed border-orange-200 dark:border-orange-900/50 hover:border-orange-400 dark:hover:border-orange-500 text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 bg-transparent dark:bg-[#1E1F20]/50">
              <Plus size={16} /> Registrar nova vacina
            </button>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'historico' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-3">
              {petAppointments.length === 0 ? (
                <EmptyState
                  imageUrl="/romeu_e_julieta_1788367558045.jpg"
                  title="Nenhum histórico ainda"
                  description="Assim como o Romeu e a Julieta, estamos só esperando o primeiro encontro. Agende um serviço!"
                  action={{ label: 'Agendar agora', onClick: () => navigate('/tutor/booking') }}
                />
              ) : (
                petAppointments.map((apt) => (
                  <div key={apt.id} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className={[
                        'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0',
                        apt.serviceCategory === 'consulta' ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-orange-50 dark:bg-orange-950/40',
                      ].join(' ')}>
                        {apt.serviceCategory === 'consulta' ? '🩺' : '✂️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3] text-sm">{apt.serviceName}</p>
                            <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{apt.establishmentName}</p>
                          </div>
                          <Badge variant={apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'error' : 'info'} size="sm">
                            {apt.status === 'completed' ? '✓ Concluído' : apt.status === 'cancelled' ? 'Cancelado' : apt.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-1">
                          {new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {apt.time}
                        </p>
                        {apt.rating && (
                          <div className="flex text-amber-400 text-xs mt-1">
                            {'★'.repeat(apt.rating)}{'☆'.repeat(5 - apt.rating)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Consultas Tab */}
        {activeTab === 'consultas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-3">
              {petAppointments.filter((a) => a.serviceCategory === 'consulta').length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🩺</p>
                  <p className="text-neutral-500 dark:text-[#8E918F]">Nenhuma consulta registrada</p>
                </div>
              ) : (
                petAppointments.filter((a) => a.serviceCategory === 'consulta').map((apt) => (
                  <div key={apt.id} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-xl p-4">
                    <p className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3]">{apt.serviceName}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{apt.establishmentName} · {apt.professionalName}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                ))
              )}
              <button
                onClick={() => navigate('/tutor/booking')}
                className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Agendar consulta
              </button>
            </div>
          </motion.div>
        )}

        {/* Serviços Tab */}
        {activeTab === 'servicos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-3">
              {petAppointments.filter((a) => a.serviceCategory !== 'consulta').length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">✂️</p>
                  <p className="text-neutral-500 dark:text-[#8E918F]">Nenhum serviço registrado</p>
                </div>
              ) : (
                petAppointments.filter((a) => a.serviceCategory !== 'consulta').map((apt) => (
                  <div key={apt.id} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-xl p-4">
                    <p className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3]">{apt.serviceName}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{apt.establishmentName}</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/tutor/booking')}
          className="flex items-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl shadow-xl shadow-orange-200 transition-all"
        >
          <Calendar size={18} />
          Agendar serviço
        </motion.button>
      </div>
    </div>
  );
}
