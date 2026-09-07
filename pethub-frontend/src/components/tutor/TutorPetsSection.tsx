import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  PawPrint,
} from 'lucide-react';
import SpeciesIcon from '@/components/shared/SpeciesIcon';
import { getSpeciesInfo } from '@/utils/species';

export interface PetItem {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  gender?: string | null;
  photo?: string | null;
  birthDate?: string | null;
  approximateAge?: string | null;
  vaccinationStatus?: string | null;
  weight?: number | null;
}

export interface TutorPetsSectionProps {
  pets: PetItem[];
  isLoading?: boolean;
}

export const TutorPetsSection: React.FC<TutorPetsSectionProps> = ({
  pets,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollLeft(el.scrollLeft > 12);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 12);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    // Initial check after paint/images load
    const timer = setTimeout(checkScroll, 300);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [pets, checkScroll]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.75, 300);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="mb-8"
      aria-label="Meus pets"
    >
      {/* ---- Section Header ---- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] tracking-tight">
            Meus pets
          </h2>
          {!isLoading && pets.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40">
              {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Directional carousel controls on desktop when overflow exists */}
          {!isLoading && (canScrollLeft || canScrollRight) && (
            <div className="hidden sm:flex items-center gap-1.5 mr-1" aria-label="Controles do carrossel">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className="w-8 h-8 rounded-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                aria-label="Ver pets anteriores"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="w-8 h-8 rounded-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                aria-label="Ver próximos pets"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {!isLoading && pets.length > 0 && (
            <Link
              to="/tutor/pets"
              className="group text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-orange-50/60 dark:hover:bg-orange-950/25"
            >
              <span>Ver todos</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* ---- Content Area ---- */}
      {isLoading ? (
        /* Skeleton state maintaining identical card dimensions */
        <div className="flex gap-4 overflow-hidden pb-2 -mx-4 px-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="w-[215px] sm:w-[245px] md:w-[260px] shrink-0 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden shadow-2xs animate-pulse"
            >
              <div className="h-36 sm:h-40 md:h-44 bg-neutral-100 dark:bg-[#282A2C]" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-neutral-200 dark:bg-[#282A2C] rounded-md w-3/4" />
                <div className="h-3 bg-neutral-200 dark:bg-[#282A2C] rounded-md w-1/2" />
                <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex justify-between items-center">
                  <div className="h-3 bg-neutral-200 dark:bg-[#282A2C] rounded-md w-16" />
                  <div className="h-3 bg-neutral-200 dark:bg-[#282A2C] rounded-md w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pets.length === 0 ? (
        /* Premium Empty State */
        <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-8 sm:p-10 border border-neutral-100 dark:border-[#313335] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center mx-auto mb-4 text-orange-500 dark:text-orange-400 shadow-2xs">
            <PawPrint size={32} strokeWidth={2} />
          </div>
          <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base sm:text-lg mb-1.5">
            Seus pets aparecerão aqui
          </h3>
          <p className="text-neutral-500 dark:text-[#A8AAAA] text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Cadastre seu primeiro pet para acompanhar agendamentos, serviços e cuidados.
          </p>
          <button
            type="button"
            onClick={() => navigate('/tutor/pets/novo')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            Adicionar primeiro pet
          </button>
        </div>
      ) : (
        /* Dynamic Carousel / Horizontal Flex with Snap */
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-none pb-2 -mx-4 px-4 snap-x snap-mandatory focus:outline-none"
          tabIndex={0}
          aria-label="Lista de pets cadastrados"
        >
          {pets.map((pet) => {
            const speciesInfo = pet.species ? getSpeciesInfo(pet.species) : null;
            const speciesLabel = speciesInfo?.label || pet.species || 'Pet';

            return (
              <motion.article
                key={pet.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group shrink-0 snap-start w-[215px] sm:w-[245px] md:w-[260px] bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs hover:shadow-lg dark:hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.6)] hover:border-orange-300 dark:hover:border-orange-500/50 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer select-none"
                onClick={() => navigate(`/tutor/pets/${pet.id}`)}
                aria-label={`Ver detalhes de ${pet.name}`}
              >
                {/* Pet Hero Photography */}
                <div className="relative h-36 sm:h-40 md:h-44 w-full overflow-hidden bg-neutral-100 dark:bg-[#282A2C]">
                  <img
                    src={pet.photo || '/fallback-dog.png'}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-dog.png';
                    }}
                  />
                  {/* Subtle lighting overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

                  {/* Species Vector Badge (Zero Emojis) */}
                  <div className="absolute top-3 left-3 backdrop-blur-md bg-black/45 dark:bg-black/60 border border-white/20 text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <SpeciesIcon
                      speciesId={pet.species || pet.breed}
                      size={13}
                      className="text-orange-400 shrink-0"
                    />
                    <span className="capitalize tracking-tight truncate max-w-[100px]">
                      {speciesLabel}
                    </span>
                  </div>
                </div>

                {/* Pet Info Content */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate tracking-tight">
                      {pet.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-[#A8AAAA] truncate mt-0.5">
                      {pet.breed?.trim() || 'Sem raça definida'}
                    </p>
                  </div>

                  {/* Card Bottom: Status & Details Affordance */}
                  <div className="pt-2.5 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between">
                    <div className="flex items-center gap-1.5" title="Pet ativo">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">
                        Ativo
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-neutral-400 dark:text-[#8E918F] group-hover:text-orange-500 dark:group-hover:text-orange-400 flex items-center gap-0.5 transition-colors">
                      Detalhes
                      <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {/* First-Class 'Adicionar Pet' Action Card */}
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group shrink-0 snap-start w-[215px] sm:w-[245px] md:w-[260px] min-h-[250px] sm:min-h-[275px] md:min-h-[295px] bg-neutral-50/70 dark:bg-[#1E1F20]/70 border-2 border-dashed border-neutral-200 dark:border-[#313335] hover:border-orange-400 dark:hover:border-orange-500/60 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 rounded-2xl flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-md select-none focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            onClick={() => navigate('/tutor/pets/novo')}
            tabIndex={0}
            role="button"
            aria-label="Cadastrar novo pet"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/tutor/pets/novo');
              }
            }}
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200/70 dark:border-orange-800/50 text-orange-500 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-2xs">
              <Plus size={26} strokeWidth={2.5} />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-800 dark:text-[#E3E3E3] group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Adicionar pet
            </h3>
            <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-[170px] mt-1.5 leading-relaxed">
              Cadastre um novo companheiro
            </p>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
};

export default TutorPetsSection;
