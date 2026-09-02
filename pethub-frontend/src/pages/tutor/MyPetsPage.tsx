import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, MoreVertical, Calendar, Syringe, Edit, Trash2 } from 'lucide-react';
import { pets } from '@/data/pets';
import { vaccines } from '@/data/vaccines';
import { appointments } from '@/data/appointments';
import { EmptyState, SkeletonCard, Badge, ConfirmModal } from '@/components/ui';
import { useToast } from '@/store/toastStore';

const speciesEmoji: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', other: '🐾',
};

export default function MyPetsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; petId: string | null }>({ open: false, petId: null });
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const myPets = pets.filter((p) => p.tutorId === 'tutor-1');

  const getPetVaccineStatus = (petId: string) => {
    const petVaccines = vaccines.filter((v) => v.petId === petId);
    if (petVaccines.some((v) => v.status === 'overdue')) return 'overdue';
    if (petVaccines.some((v) => v.status === 'upcoming')) return 'upcoming';
    return 'up-to-date';
  };

  const getPetNextAppointment = (petId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.find(
      (a) => a.petId === petId && a.date >= today && (a.status === 'confirmed' || a.status === 'pending')
    );
  };

  const getAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years === 0) return `${Math.max(1, months)} ${months <= 1 ? 'mês' : 'meses'}`;
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  const vaccineStatusConfig = {
    'up-to-date': { label: 'Vacinas em dia', variant: 'success' as const, icon: '✓' },
    upcoming: { label: 'Vacina próxima', variant: 'warning' as const, icon: '⚠' },
    overdue: { label: 'Vacina atrasada', variant: 'error' as const, icon: '!' },
  };

  const handleDelete = () => {
    toast.success('Pet removido com sucesso');
    setDeleteModal({ open: false, petId: null });
  };

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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
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
            const vaccineStatus = getPetVaccineStatus(pet.id);
            const nextApt = getPetNextAppointment(pet.id);
            const vStatus = vaccineStatusConfig[vaccineStatus];
            const isMenuOpen = openMenu === pet.id;

            return (
              <motion.div
                key={pet.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md hover:border-orange-100 transition-all duration-300 group"
              >
                {/* Photo */}
                <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => navigate(`/tutor/pets/${pet.id}`)}>
                  <img
                    src={pet.photo || '/fallback-dog.png'}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={vStatus.variant} size="sm">
                        {vStatus.icon} {vStatus.label}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {speciesEmoji[pet.species]} {pet.name}
                    </h3>
                    <p className="text-white/70 text-sm">{pet.breed} · {getAge(pet.birthDate)}</p>
                  </div>

                  {/* Menu button */}
                  <div className="absolute top-3 right-3">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : pet.id); }}
                        className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl text-white transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden z-10 w-36">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/tutor/pets/${pet.id}/editar`); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, petId: pet.id }); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  {nextApt ? (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl mb-3">
                      <Calendar size={14} className="text-orange-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-orange-600 font-medium truncate">{nextApt.serviceName}</p>
                        <p className="text-xs text-neutral-400">
                          {new Date(nextApt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {nextApt.time}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl mb-3 text-neutral-400 text-xs">
                      <Calendar size={14} />
                      Nenhum agendamento
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/tutor/pets/${pet.id}`)}
                      className="flex-1 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                    >
                      Ver perfil
                    </button>
                    <button
                      onClick={() => navigate('/tutor/booking')}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Add pet card */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ y: -4 }}
            onClick={() => navigate('/tutor/pets/novo')}
            className="border-2 border-dashed border-neutral-200 hover:border-orange-300 rounded-2xl flex flex-col items-center justify-center gap-3 py-16 text-neutral-400 hover:text-orange-500 hover:bg-orange-50 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 hover:bg-orange-100 flex items-center justify-center text-3xl">
              +
            </div>
            <p className="text-sm font-medium">Adicionar pet</p>
          </motion.button>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, petId: null })}
        onConfirm={handleDelete}
        title="Excluir pet?"
        description="Esta ação não pode ser desfeita. Todo o histórico e dados do pet serão removidos permanentemente."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
