import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, Calendar, Edit, Trash2, HelpCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { usePetStore } from '@/store/petStore';
import { EmptyState, SkeletonCard, Badge, ConfirmModal, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';

const speciesEmoji: Record<string, string> = {
  dog: '🐕', cat: '🐱', bird: '🦜', rabbit: '🐰', rodent: '🐹', fish: '🐠', reptile: '🦎', other: '🐾',
};

export default function MyPetsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { pets: myPets, isLoading, fetchPets, deletePet } = usePetStore();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; petId: string | null }>({ open: false, petId: null });
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const getVaccineInfo = (pet: any) => {
    const status = pet.vaccinationStatus || 'UNKNOWN';
    if (status === 'UP_TO_DATE') {
      return { label: 'Vacinas em dia', variant: 'success' as const, icon: '✓' };
    }
    if (status === 'PENDING') {
      return { label: 'Vacinas pendentes', variant: 'warning' as const, icon: '⚠️' };
    }
    return { label: 'Vacinas: não informado', variant: 'info' as const, icon: '❓' };
  };

  const formatAge = (pet: any) => {
    if (pet.birthDate) {
      const birth = new Date(pet.birthDate);
      const now = new Date();
      const years = now.getFullYear() - birth.getFullYear();
      const months = now.getMonth() - birth.getMonth();
      if (years === 0) return `${Math.max(1, months)} ${months <= 1 ? 'mês' : 'meses'}`;
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
    if (pet.approximateAge) {
      return pet.approximateAge;
    }
    return 'Idade não informada';
  };

  const handleDelete = async () => {
    if (deleteModal.petId) {
      try {
        await deletePet(deleteModal.petId);
        toast.success('Pet removido com sucesso');
      } catch (err) {
        toast.error('Erro ao remover pet');
      }
    }
    setDeleteModal({ open: false, petId: null });
  };

  const hasUnknownVaccines = myPets.some((p: any) => p.vaccinationStatus === 'UNKNOWN' || !p.vaccinationStatus);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Meus Pets</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{myPets.length} pet{myPets.length !== 1 ? 's' : ''} cadastrado{myPets.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/tutor/pets/novo')}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} />
          Adicionar pet
        </button>
      </div>

      {/* Helpful Vaccine Recommendation Banner if any pet has unknown status */}
      {myPets.length > 0 && hasUnknownVaccines && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
              <HelpCircle size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-blue-950">Não sabe se as vacinas do seu pet estão em dia?</p>
              <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                Recomendamos agendar uma avaliação com um médico veterinário para checar a caderneta de vacinação e manter seu amigão 100% protegido.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 self-end sm:self-auto text-xs"
            onClick={() => navigate('/tutor/explore')}
          >
            Encontrar um veterinário
          </Button>
        </motion.div>
      )}

      {myPets.length === 0 ? (
        <EmptyState
          imageUrl="/salsicha_borzoi_1788367580508.jpg"
          title="Nenhum pet cadastrado"
          description="O Salsicha está de olho... Cadastre seu primeiro pet para começar a usar o PetHub!"
          action={{ label: '+ Adicionar meu primeiro pet', onClick: () => navigate('/tutor/pets/novo') }}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {myPets.map((pet) => {
            const vInfo = getVaccineInfo(pet);
            const isMenuOpen = openMenu === pet.id;

            return (
              <motion.div
                key={pet.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md hover:border-orange-100 transition-all duration-300 group"
              >
                {/* Photo */}
                <div className="relative h-48 overflow-hidden cursor-pointer bg-neutral-100" onClick={() => navigate(`/tutor/pets/${pet.id}`)}>
                  <img
                    src={pet.photo || '/fallback-dog.png'}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  <div className="absolute top-3 left-3">
                    <Badge variant={vInfo.variant} size="sm">
                      {vInfo.icon} {vInfo.label}
                    </Badge>
                  </div>

                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                      <span>{speciesEmoji[pet.species] || '🐾'}</span> {pet.name}
                    </h3>
                    <p className="text-white/80 text-xs mt-0.5">{pet.breed || 'Raça não informada'} · {formatAge(pet)}</p>
                  </div>

                  {/* Menu button */}
                  <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenu(isMenuOpen ? null : pet.id)}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                      title="Opções"
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-10"
                        >
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              navigate(`/tutor/pets/${pet.id}/editar`);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <Edit size={14} />
                            Editar dados
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              setDeleteModal({ open: true, petId: pet.id });
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Remover pet
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">
                    {pet.gender === 'FEMALE' ? '♀️ Fêmea' : '♂️ Macho'} {pet.weight ? `· ${pet.weight} kg` : ''}
                  </span>
                  <button
                    onClick={() => navigate(`/tutor/pets/${pet.id}`)}
                    className="text-orange-600 font-bold hover:underline flex items-center gap-1"
                  >
                    Ver perfil →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, petId: null })}
        onConfirm={handleDelete}
        title="Remover pet"
        description="Tem certeza que deseja remover este pet? Esta ação não pode ser desfeita."
        confirmText="Sim, remover"
        variant="danger"
      />
    </div>
  );
}
