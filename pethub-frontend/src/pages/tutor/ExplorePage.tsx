import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Star, ChevronRight, Phone, Globe, Search, Droplets, Scissors, Stethoscope, Award, Home, Sparkles, Footprints, ShoppingBag, Heart, CheckCircle2, Wrench, Camera, Tag, Flag, ShieldCheck, X, MessageSquareHeart, Upload, Trash2, Check, AlertCircle, Plus, Image as ImageIcon } from 'lucide-react';
import { SearchBar, Badge, Rating, EmptyState, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { formatAcceptedSpeciesBadges } from '@/utils/species';
import { ReportModal } from '@/components/shared/ReportModal';
import { ServiceLogo } from '@/components/shared/ServiceLogo';

const categoryLabels: Record<string, string> = {
  banho: 'Banho', tosa: 'Tosa', veterinario: 'Veterinário',
  adestramento: 'Adestramento', hospedagem: 'Hospedagem',
  creche: 'Creche', passeio: 'Passeio', consulta: 'Consulta',
  cirurgia: 'Cirurgia', outro: 'Outro',
};

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekDayLabels: Record<string, string> = {
  monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
  thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
};

// ============================================================
// EXPLORE PAGE
// ============================================================
export function ExplorePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>(['est-1', 'est-3']);

  const categories = [
    { id: 'all', label: 'Todos', icon: Search },
    { id: 'banho', label: 'Banho', icon: Droplets },
    { id: 'tosa', label: 'Tosa', icon: Scissors },
    { id: 'veterinario', label: 'Veterinário', icon: Stethoscope },
    { id: 'adestramento', label: 'Adestramento', icon: Award },
    { id: 'hospedagem', label: 'Hospedagem', icon: Home },
    { id: 'creche', label: 'Creche', icon: Sparkles },
    { id: 'passeio', label: 'Passeio', icon: Footprints },
    { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
  ];

  const [realEstablishments, setRealEstablishments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchEstabs = async () => {
      try {
        const response = await api.get('/establishments');
        // Map backend to frontend format
        const mapped = response.data.map((e: any) => ({
          id: e.id,
          userId: e.id,
          businessName: e.name || e.businessName || 'Estabelecimento PetHub',
          category: Array.isArray(e.category) && e.category.length > 0 ? e.category : ['banho', 'tosa', 'veterinario'],
          logo: e.logo || '/salsicha_borzoi_1788367580508.jpg',
          cover: e.cover || e.coverPhoto || '/jorginho_derpy_shepherd_1788367498390.jpg',
          coverPhoto: e.coverPhoto || e.cover || null,
          address: e.address || 'Ourinhos, SP',
          rating: typeof e.rating === 'number' ? e.rating : null,
          reviewCount: typeof e.reviewCount === 'number' ? e.reviewCount : 0,
          isApproved: true,
          workingHours: e.workingHours || { saturday: { isOpen: true } },
          acceptedSpecies: e.acceptedSpecies || (e.establishmentProfile?.acceptedSpecies) || [],
          isProgramPartner: Boolean(e.isProgramPartner),
        }));
        setRealEstablishments(mapped);
      } catch (error) {
        toast.error('Erro ao buscar estabelecimentos reais.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEstabs();
  }, []);

  const filteredEstablishments = realEstablishments
    .filter((est) => {
      if (!est.isApproved) return false;
      const matchesSearch = search === '' || est.businessName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || est.category.includes(activeCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (Boolean(a.isProgramPartner) === Boolean(b.isProgramPartner)) return 0;
      return a.isProgramPartner ? -1 : 1;
    });

  const toggleFavorite = (estId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => prev.includes(estId) ? prev.filter((f) => f !== estId) : [...prev, estId]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Explorar</h1>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 dark:text-[#8E918F]">
          <MapPin size={14} />
          <span>Ourinhos, SP</span>
        </div>
      </div>

      <SearchBar
        placeholder="Buscar estabelecimentos, serviços..."
        value={search}
        onChange={setSearch}
        onClear={() => setSearch('')}
        className="mb-4"
      />

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6 -mx-4 px-4">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-200 border-2 shrink-0 cursor-pointer',
                activeCategory === cat.id
                  ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                  : 'bg-white dark:bg-[#1E1F20] border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] hover:border-orange-200 dark:hover:border-orange-500/50',
              ].join(' ')}
            >
              <IconComponent size={15} className={activeCategory === cat.id ? 'text-white' : 'text-neutral-500 dark:text-[#8E918F]'} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <p className="text-sm text-neutral-400 dark:text-[#8E918F] mb-4">{filteredEstablishments.length} resultado{filteredEstablishments.length !== 1 ? 's' : ''}</p>

      {filteredEstablishments.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-neutral-400 dark:text-[#8E918F]" />}
          title="Nenhum resultado encontrado"
          description="Tente uma busca diferente ou remova os filtros."
          action={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setActiveCategory('all'); } }}
        />
      ) : (
        <div className="space-y-4">
          {filteredEstablishments.map((est, i) => (
            <motion.div
              key={est.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/tutor/estabelecimentos/${est.id}`)}
              className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-100 dark:hover:border-orange-500/40 transition-all duration-300 group"
            >
              <div className="relative h-48 overflow-hidden bg-neutral-900">
                {est.coverPhoto ? (
                  <img
                    src={est.coverPhoto}
                    alt={est.businessName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <video
                    src="/user_estabelecimento.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  {est.isProgramPartner && (
                    <span className="px-2.5 py-1 bg-emerald-800/85 text-white text-xs rounded-lg backdrop-blur-sm font-semibold flex items-center gap-1 border border-emerald-400/30 shadow-xs">
                      <ShieldCheck size={13} />
                      <span>Parceiro do Programa</span>
                    </span>
                  )}
                  {est.category.slice(0, 2).map((cat) => (
                    <span key={cat} className="px-2.5 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm font-medium capitalize">
                      {cat}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => toggleFavorite(est.id, e)}
                  className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors"
                >
                  <Heart size={18} className={favorites.includes(est.id) ? "fill-red-500 text-red-500" : "text-white"} />
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${est.workingHours?.saturday?.isOpen !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{est.workingHours?.saturday?.isOpen !== false ? 'Aberto' : 'Fechado'}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{est.businessName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {est.rating !== null ? (
                        <>
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-neutral-700 dark:text-[#C4C7C5]">{est.rating.toFixed(1)}</span>
                          <span className="text-xs text-neutral-400 dark:text-[#8E918F]">({est.reviewCount} {est.reviewCount === 1 ? 'avaliação' : 'avaliações'})</span>
                        </>
                      ) : (
                        <span className="text-xs text-neutral-400 dark:text-[#8E918F]">Novo no PetHub · Sem avaliações</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                      <p className="text-xs text-neutral-400 dark:text-[#8E918F]">A partir de</p>
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        R$30
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/tutor/booking', { state: { prefillEstablishment: est } });
                        }}
                        className="mt-1 px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors cursor-pointer"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-400 dark:text-[#8E918F]">
                  <MapPin size={14} />
                  <span className="truncate">
                    {typeof est.address === 'object' && est.address !== null
                      ? `${est.address.neighborhood || ''}, ${est.address.city || 'Ourinhos'}`
                      : (est.address || 'Ourinhos, SP')} · 1,2 km
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-[#313335] flex items-center gap-1.5 text-xs text-neutral-600 dark:text-[#C4C7C5]">
                  <span className="font-semibold text-neutral-500 dark:text-[#8E918F]">Animais atendidos:</span>
                  <span className="font-medium text-neutral-800 dark:text-[#E3E3E3]">{formatAcceptedSpeciesBadges(est.acceptedSpecies)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================================
// ESTABLISHMENT PROFILE PAGE
// ============================================================
export function EstablishmentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('servicos');
  const [isFavorite, setIsFavorite] = useState(false);
  const [est, setEst] = useState<any>(null);
  const [estServices, setEstServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Reviews State (100% Real from Database)
  const [reviewsData, setReviewsData] = useState<{
    rating: number | null;
    reviewCount: number;
    distribution: Record<number, number>;
    reviews: any[];
  }>({
    rating: null,
    reviewCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: [],
  });

  // Eligibility & Tutor Pets State
  const [eligibility, setEligibility] = useState<{
    canReview: boolean;
    eligibleAppointments: any[];
  }>({ canReview: false, eligibleAppointments: [] });
  const [tutorPets, setTutorPets] = useState<any[]>([]);

  // Modals State
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<any | null>(null);
  const [selectedPetForBooking, setSelectedPetForBooking] = useState<any | null>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Review Form State
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewPetPhotoFile, setReviewPetPhotoFile] = useState<File | null>(null);
  const [reviewPetPhotoPreview, setReviewPetPhotoPreview] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function loadData() {
    if (!id) return;
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [
        api.get('/establishments'),
        api.get(`/services?establishmentId=${id}`),
        api.get(`/reviews?establishmentId=${id}`),
      ];

      if (currentUser && (currentUser.role === 'tutor' || (currentUser.role as any) === 'TUTOR')) {
        promises.push(api.get('/pets'));
        promises.push(api.get(`/reviews/eligibility?establishmentId=${id}`));
      }

      const results = await Promise.allSettled(promises);
      const [estsRes, srvRes, revRes, petsRes, eligRes] = results;

      if (estsRes.status === 'fulfilled' && Array.isArray(estsRes.value.data)) {
        const found = estsRes.value.data.find((e: any) => e.id === id);
        if (found) setEst(found);
      }
      if (srvRes.status === 'fulfilled' && Array.isArray(srvRes.value.data)) {
        setEstServices(srvRes.value.data);
      }
      if (revRes.status === 'fulfilled' && revRes.value.data) {
        setReviewsData(revRes.value.data);
      }
      if (petsRes && petsRes.status === 'fulfilled' && Array.isArray(petsRes.value.data)) {
        setTutorPets(petsRes.value.data);
        if (petsRes.value.data.length > 0) {
          setSelectedPetForBooking(petsRes.value.data[0]);
        }
      }
      if (eligRes && eligRes.status === 'fulfilled' && eligRes.value.data) {
        setEligibility(eligRes.value.data);
        const unreviewed = eligRes.value.data.eligibleAppointments?.find((a: any) => !a.alreadyReviewed);
        if (unreviewed) {
          setReviewAppointmentId(unreviewed.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id, currentUser]);

  const handleStartBooking = (svc: any) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setSelectedServiceForBooking(svc);
    if (tutorPets.length > 0) {
      setIsPetModalOpen(true);
    } else {
      navigate('/tutor/booking', {
        state: {
          prefillEstablishment: est,
          prefillService: svc,
        },
      });
    }
  };

  const handleConfirmPetAndBook = () => {
    setIsPetModalOpen(false);
    navigate('/tutor/booking', {
      state: {
        prefillEstablishment: est,
        prefillService: selectedServiceForBooking,
        prefillPet: selectedPetForBooking,
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A foto deve ter no máximo 5MB.');
        return;
      }
      setReviewPetPhotoFile(file);
      setReviewPetPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setReviewPetPhotoFile(null);
    if (reviewPetPhotoPreview) {
      URL.revokeObjectURL(reviewPetPhotoPreview);
      setReviewPetPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAppointmentId) {
      toast.error('Selecione o atendimento a ser avaliado.');
      return;
    }
    if (reviewComment.trim().length < 3) {
      toast.error('O comentário deve ter no mínimo 3 caracteres.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      let petPhotoUrl: string | null = null;
      if (reviewPetPhotoFile) {
        const formData = new FormData();
        formData.append('file', reviewPetPhotoFile);
        const uploadRes = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        petPhotoUrl = uploadRes.data.url;
      }

      await api.post('/reviews', {
        appointmentId: reviewAppointmentId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        petPhotoUrl,
      });

      toast.success('Avaliação publicada com sucesso!');
      setIsReviewModalOpen(false);
      setReviewComment('');
      handleRemovePhoto();
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar avaliação.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-64 bg-neutral-100 dark:bg-[#282A2C] rounded-3xl animate-pulse" />
        <div className="h-32 bg-neutral-100 dark:bg-[#282A2C] rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!est) return <div className="p-8 text-center text-neutral-500 dark:text-[#8E918F] font-semibold">Estabelecimento não encontrado</div>;

  const tabs = [
    { id: 'servicos', label: 'Serviços', count: estServices.length },
    { id: 'avaliacoes', label: 'Avaliações', count: reviewsData.reviewCount },
  ];
  if (est.photos && est.photos.length > 0) {
    tabs.push({ id: 'fotos', label: 'Fotos', count: est.photos.length });
  }
  if (est.employees && est.employees.length > 0) {
    tabs.push({ id: 'profissionais', label: 'Profissionais', count: est.employees.length });
  }

  const weekdayNow = weekDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const ratingLabelMap: Record<number, string> = {
    1: 'Muito Ruim',
    2: 'Ruim',
    3: 'Bom',
    4: 'Muito Bom',
    5: 'Excelente',
  };

  return (
    <div className="pb-12">
      {/* Cover + back */}
      <div className="relative h-64 overflow-hidden bg-neutral-900">
        {est.coverPhoto ? (
          <img src={est.coverPhoto} alt={est.businessName} className="w-full h-full object-cover" />
        ) : (
          <video src="/user_estabelecimento.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors cursor-pointer"
        >
          <Heart size={20} className={isFavorite ? "fill-red-500 text-red-500" : "text-white"} />
        </button>
      </div>

      {/* Logo + Info */}
      <div className="bg-white dark:bg-[#1E1F20] px-4 pb-0 border-b border-neutral-100 dark:border-[#313335]">
        <div className="flex items-end gap-4 -mt-8 mb-4 max-w-4xl mx-auto">
          <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#1E1F20] overflow-hidden shadow-xl shrink-0 bg-neutral-900 relative">
            {est.logo || est.coverPhoto ? (
              <img src={est.logo || est.coverPhoto} alt={est.businessName} className="w-full h-full object-cover" />
            ) : (
              <video src="/user_estabelecimento.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" />
            )}
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] leading-tight truncate">{est.businessName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2.5 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-full font-medium inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Verificado
              </span>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="text-xs px-2.5 py-0.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Denunciar perfil"
              >
                <Flag size={12} /> Denunciar
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={14} className={reviewsData.rating !== null ? "fill-amber-400 text-amber-400" : "text-neutral-400"} />
                <span className="font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  {reviewsData.rating !== null ? reviewsData.rating.toFixed(1) : 'Novo'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
                {reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] rounded-xl p-3">
              <p className="text-sm font-medium text-neutral-700 dark:text-[#E3E3E3] mb-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${est.workingHours?.[weekdayNow]?.isOpen === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span>{est.workingHours?.[weekdayNow]?.isOpen === false ? 'Fechado' : 'Aberto agora'}</span>
              </p>
              <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
                {est.workingHours?.[weekdayNow]?.open ? `${est.workingHours[weekdayNow].open} - ${est.workingHours[weekdayNow].close}` : '08:00 - 18:00'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-[#8E918F] mb-2">
            <MapPin size={14} />
            <span>{typeof est.address === 'string' ? est.address : (est.address?.street ? `${est.address.street}, ${est.address.number || ''} · ${est.address.city || ''}` : `${est.city || 'Ourinhos'}, ${est.state || 'SP'}`)}</span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-[#C4C7C5] mb-3">{est.description || 'Estabelecimento parceiro dedicado aos melhores cuidados para o seu pet.'}</p>

          <div className="mb-4 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-xl flex items-center gap-2 text-xs border border-neutral-100 dark:border-[#313335]">
            <span className="font-bold text-neutral-700 dark:text-[#E3E3E3]">Animais atendidos:</span>
            <span className="text-neutral-600 dark:text-[#C4C7C5] font-medium">{formatAcceptedSpeciesBadges(est.acceptedSpecies || est.establishmentProfile?.acceptedSpecies)}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-neutral-100 dark:border-[#313335] overflow-x-auto scrollbar-hide -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px cursor-pointer',
                  activeTab === tab.id ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-semibold' : 'border-transparent text-neutral-500 dark:text-[#8E918F] hover:text-neutral-700 dark:hover:text-[#E3E3E3]',
                ].join(' ')}
              >
                {tab.label}
                <span className="text-xs bg-neutral-100 dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] px-1.5 py-0.5 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {activeTab === 'servicos' && (
          <div className="space-y-4">
            {estServices.length === 0 ? (
              <EmptyState icon={<Wrench className="w-8 h-8 text-neutral-400 dark:text-[#8E918F]" />} title="Nenhum serviço cadastrado" />
            ) : (
              estServices.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="shrink-0 pt-0.5">
                      <ServiceLogo category={svc.category} name={svc.name} size="md" showBadge={true} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base text-neutral-900 dark:text-[#E3E3E3] leading-snug">{svc.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] font-medium capitalize">
                          {categoryLabels[svc.category] || svc.category || 'Serviço'}
                        </span>
                      </div>
                      {svc.description && (
                        <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-1 line-clamp-2 leading-relaxed">
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-neutral-400 dark:text-[#8E918F]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock size={13} className="text-orange-500" />
                          {svc.duration >= 60 ? `${Math.floor(svc.duration / 60)}h${svc.duration % 60 ? ` ${svc.duration % 60}min` : ''}` : `${svc.duration} min`}
                        </span>
                        {svc.animalType && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Tag size={13} />
                            {svc.animalType === 'dog' ? 'Cães' : svc.animalType === 'cat' ? 'Gatos' : 'Geral'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-[#313335] shrink-0 gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] block text-left sm:text-right">Valor</span>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400 leading-tight">
                        R$ {Number(svc.price).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStartBooking(svc)}
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'avaliacoes' && (
          <div className="space-y-5">
            {/* Header / Action */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Avaliações dos Clientes</h2>
              {eligibility.canReview && (
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Star size={14} className="fill-white" />
                  <span>Avaliar Atendimento</span>
                </button>
              )}
            </div>

            {reviewsData.reviewCount > 0 ? (
              <>
                {/* Summary Box */}
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center sm:pr-6 sm:border-r border-neutral-100 dark:border-[#313335] shrink-0">
                      <p className="text-5xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                        {reviewsData.rating !== null ? reviewsData.rating.toFixed(1) : '-'}
                      </p>
                      <div className="flex text-amber-400 justify-center mt-1.5 gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            className={
                              reviewsData.rating && s <= Math.round(reviewsData.rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-300 dark:text-neutral-600'
                            }
                          />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-1.5">
                        {reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    </div>

                    <div className="flex-1 w-full space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewsData.distribution[star] || 0;
                        const pct = reviewsData.reviewCount > 0 ? Math.round((count / reviewsData.reviewCount) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2.5">
                            <span className="text-xs text-neutral-500 dark:text-[#8E918F] w-3 font-medium">{star}</span>
                            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                            <div className="flex-1 h-2 bg-neutral-100 dark:bg-[#282A2C] rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-neutral-400 dark:text-[#8E918F] w-9 text-right font-mono">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Real Reviews List */}
                <div className="space-y-3">
                  {reviewsData.reviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-5 shadow-xs"
                    >
                      <div className="flex items-start gap-3.5 mb-3">
                        {rev.tutor.avatar ? (
                          <img
                            src={rev.tutor.avatar}
                            alt={rev.tutor.name}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-[#313335] shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs shrink-0 border border-orange-200/50 dark:border-orange-800/40">
                            {rev.tutor.name?.[0]?.toUpperCase() || 'T'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3] truncate">
                              {rev.tutor.name}
                            </p>
                            {rev.createdAt && (
                              <span className="text-[11px] text-neutral-400 dark:text-[#8E918F] shrink-0">
                                {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex text-amber-400 text-xs gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={12}
                                  className={s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-neutral-400 dark:text-[#8E918F]">·</span>
                            <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md">
                              {rev.serviceName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-neutral-700 dark:text-[#C4C7C5] leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>

                      {rev.petPhotoUrl && (
                        <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-[#313335]">
                          <p className="text-[11px] font-medium text-neutral-400 dark:text-[#8E918F] mb-1.5 flex items-center gap-1">
                            <Camera size={12} /> Foto do pet após o atendimento:
                          </p>
                          <div
                            onClick={() => setLightboxPhoto(rev.petPhotoUrl)}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] bg-neutral-100 dark:bg-[#131314] cursor-pointer hover:opacity-90 transition-opacity"
                            title="Clique para ampliar"
                          >
                            <img
                              src={rev.petPhotoUrl}
                              alt="Resultado do pet"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {rev.reply && (
                        <div className="mt-3.5 pl-3.5 border-l-2 border-orange-500/60 bg-neutral-50 dark:bg-[#282A2C]/40 p-3 rounded-r-xl">
                          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-0.5">
                            Resposta do estabelecimento
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] leading-relaxed">
                            {rev.reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Elegant Empty State — zero fake reviews, zero emojis */
              <div className="text-center py-12 px-6 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200/60 dark:border-[#313335] flex items-center justify-center mx-auto text-neutral-400 dark:text-[#8E918F]">
                  <MessageSquareHeart size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">
                    Este estabelecimento ainda não possui avaliações.
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-1 max-w-sm mx-auto">
                    Seja o primeiro a avaliar após utilizar um serviço.
                  </p>
                </div>
                {eligibility.canReview && (
                  <div className="pt-2">
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Avaliar Atendimento
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fotos' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {est.photos && est.photos.length > 0 ? (
              est.photos.map((photo: string, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-neutral-900">
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" />
                </div>
              ))
            ) : (
              <EmptyState icon={<Camera className="w-8 h-8 text-neutral-400 dark:text-[#8E918F]" />} title="Nenhuma foto" className="col-span-3" />
            )}
          </div>
        )}

        {activeTab === 'profissionais' && (
          <div className="space-y-3">
            {est.employees && est.employees.length > 0 ? (
              est.employees.map((prof: any) => (
                <div
                  key={prof.id}
                  className="bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-100 dark:border-[#313335] p-4 flex items-start gap-4"
                >
                  {prof.avatar ? (
                    <img src={prof.avatar} alt={prof.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-lg shrink-0">
                      {prof.name?.[0] || 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{prof.name}</p>
                    <p className="text-sm text-neutral-400 dark:text-[#8E918F]">{prof.role || 'Profissional'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] text-neutral-400 dark:text-[#8E918F] text-sm">
                Nenhum profissional listado para este estabelecimento.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pet Selection Modal ("Para qual pet?") */}
      {isPetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Para qual pet?</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Selecione o pet que receberá o serviço
                </p>
              </div>
              <button
                onClick={() => setIsPetModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {selectedServiceForBooking && (
              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/20 rounded-xl border border-orange-200/50 dark:border-orange-900/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider block">
                    Serviço Selecionado
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedServiceForBooking.name}</span>
                </div>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                  R$ {Number(selectedServiceForBooking.price).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {tutorPets.map((pet) => {
                const isSelected = selectedPetForBooking?.id === pet.id;
                return (
                  <div
                    key={pet.id}
                    onClick={() => setSelectedPetForBooking(pet)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20'
                        : 'border-neutral-200 dark:border-[#313335] hover:border-orange-200 dark:hover:border-orange-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {pet.photo ? (
                        <img src={pet.photo} alt={pet.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-neutral-300 font-bold flex items-center justify-center text-sm">
                          {pet.name?.[0] || 'P'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white">{pet.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
                          {pet.species === 'dog' ? 'Cachorro' : pet.species === 'cat' ? 'Gato' : pet.species} {pet.breed ? `· ${pet.breed}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPetModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmPetAndBook}
                disabled={!selectedPetForBooking}
                className="flex-1 font-bold"
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal ("Avaliar Atendimento") */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Avaliar Atendimento</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {est.businessName}
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Select Eligible Appointment */}
              {eligibility.eligibleAppointments.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-[#E3E3E3] block mb-1.5">
                    Selecione o serviço realizado
                  </label>
                  <select
                    value={reviewAppointmentId}
                    onChange={(e) => setReviewAppointmentId(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-[#18191B] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-[#E3E3E3] focus:outline-none"
                  >
                    {eligibility.eligibleAppointments
                      .filter((a) => !a.alreadyReviewed)
                      .map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          {apt.serviceName} ({apt.petName}) - {new Date(apt.date).toLocaleDateString('pt-BR')}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Star Rating Picker */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-[#E3E3E3] block mb-1.5">
                  Qual nota você dá para este atendimento?
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={28}
                          className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-neutral-700 dark:text-[#E3E3E3]">
                    {ratingLabelMap[reviewRating] || ''}
                  </span>
                </div>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-[#E3E3E3] block mb-1.5">
                  Comentário
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Conte como foi sua experiência com o atendimento e cuidados com seu pet..."
                  className="w-full bg-neutral-50 dark:bg-[#18191B] border border-neutral-200 dark:border-[#313335] rounded-xl p-3 text-xs text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Pet Photo Section */}
              <div className="p-3.5 bg-neutral-50 dark:bg-[#18191B] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-white">Quer mostrar o resultado?</p>
                  <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                    Anexe uma foto do seu pet após o atendimento (opcional).
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {reviewPetPhotoPreview ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] relative">
                      <img src={reviewPetPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-medium flex items-center gap-1 border border-rose-200 dark:border-rose-900/40 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} /> Remover foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-white dark:bg-[#282A2C] border border-orange-200 dark:border-orange-900/40 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Camera size={14} /> Adicionar foto
                  </button>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isSubmittingReview}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingReview}
                  className="flex-1 font-bold"
                >
                  {isSubmittingReview ? 'Publicando...' : 'Publicar Avaliação'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto}
              alt="Foto ampliada do pet"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-neutral-900"
            />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="ESTABLISHMENT"
        reportedEstablishmentId={est.id}
        reportedUserId={est.userId}
        targetName={est.businessName}
      />
    </div>
  );
}
