import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Star, ChevronRight, Phone, Globe } from 'lucide-react';
import { establishments } from '@/data/users';
import { services } from '@/data/services';
import { reviews } from '@/data/reports';
import { professionals } from '@/data/users';
import { products } from '@/data/products';
import { SearchBar, Badge, Rating, EmptyState } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';

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
    { id: 'all', label: 'Todos', emoji: '🔍' },
    { id: 'banho', label: 'Banho', emoji: '🛁' },
    { id: 'tosa', label: 'Tosa', emoji: '✂️' },
    { id: 'veterinario', label: 'Veterinário', emoji: '🩺' },
    { id: 'adestramento', label: 'Adestramento', emoji: '🐕' },
    { id: 'hospedagem', label: 'Hospedagem', emoji: '🏡' },
    { id: 'creche', label: 'Creche', emoji: '🎒' },
    { id: 'passeio', label: 'Passeio', emoji: '🌳' },
    { id: 'produtos', label: 'Produtos', emoji: '🛍️' },
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
          rating: e.rating || 4.8,
          reviewCount: e.reviewCount || 15,
          isApproved: true,
          workingHours: e.workingHours || { saturday: { isOpen: true } },
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

  const filteredEstablishments = realEstablishments.filter((est) => {
    if (!est.isApproved) return false;
    const matchesSearch = search === '' || est.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || est.category.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (estId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => prev.includes(estId) ? prev.filter((f) => f !== estId) : [...prev, estId]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Explorar</h1>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
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
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-200 border-2 shrink-0',
              activeCategory === cat.id
                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-orange-200',
            ].join(' ')}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <p className="text-sm text-neutral-400 mb-4">{filteredEstablishments.length} resultado{filteredEstablishments.length !== 1 ? 's' : ''}</p>

      {filteredEstablishments.length === 0 ? (
        <EmptyState
          emoji="🔍"
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
              className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-100 transition-all duration-300 group"
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
                <div className="absolute top-3 left-3 flex gap-2">
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
                  {favorites.includes(est.id) ? '❤️' : '🤍'}
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm">
                  {est.workingHours?.saturday?.isOpen !== false ? '🟢 Aberto' : '🔴 Fechado'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-neutral-900 truncate">{est.businessName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-neutral-700">{est.rating}</span>
                      <span className="text-xs text-neutral-400">({est.reviewCount} avaliações)</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                      <p className="text-xs text-neutral-400">A partir de</p>
                      <p className="text-sm font-bold text-orange-600">
                        R$30
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/tutor/booking', { state: { prefillEstablishment: est } });
                        }}
                        className="mt-1 px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-200 transition-colors cursor-pointer"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-400">
                  <MapPin size={14} />
                  <span className="truncate">
                    {typeof est.address === 'object' && est.address !== null
                      ? `${est.address.neighborhood || ''}, ${est.address.city || 'Ourinhos'}`
                      : (est.address || 'Ourinhos, SP')} · 1,2 km
                  </span>
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
  const [isFavorite, setIsFavorite] = useState(true);

  const est = establishments.find((e) => e.id === id);
  if (!est) return <div className="p-8 text-center text-neutral-500">Estabelecimento não encontrado</div>;

  const estServices = services.filter((s) => s.establishmentId === est.id);
  const estProfessionals = professionals.filter((p) => p.establishmentId === est.id);
  const estProducts = products.filter((p) => p.establishmentId === est.id);
  const estReviews = reviews.filter((r) => r.establishmentId === est.id);

  const tabs = [
    { id: 'servicos', label: 'Serviços', count: estServices.length },
    { id: 'fotos', label: 'Fotos', count: est.photos.length },
    { id: 'avaliacoes', label: 'Avaliações', count: est.reviewCount },
    { id: 'profissionais', label: 'Profissionais', count: estProfessionals.length },
  ];

  const weekdayNow = weekDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div>
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
          className="absolute top-4 left-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors text-xl"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Logo + Info */}
      <div className="bg-white px-4 pb-0">
        <div className="flex items-end gap-4 -mt-8 mb-4">
          <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-xl shrink-0 bg-neutral-900 relative">
            {est.logo || est.coverPhoto ? (
              <img src={est.logo || est.coverPhoto} alt={est.businessName} className="w-full h-full object-cover" />
            ) : (
              <video src="/user_estabelecimento.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" />
            )}
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 leading-tight truncate">{est.businessName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">✓ Verificado</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="font-bold text-neutral-900">{est.rating}</span>
            </div>
            <p className="text-xs text-neutral-400">{est.reviewCount} avaliações</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <p className="text-sm font-medium text-neutral-700 mb-1">{est.workingHours[weekdayNow as keyof typeof est.workingHours]?.isOpen ? '🟢 Aberto agora' : '🔴 Fechado'}</p>
            <p className="text-xs text-neutral-400">{est.workingHours[weekdayNow as keyof typeof est.workingHours]?.open} - {est.workingHours[weekdayNow as keyof typeof est.workingHours]?.close}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-2">
          <MapPin size={14} />
          <span>{est.address.street}, {est.address.number} · {est.address.neighborhood}, {est.address.city}</span>
        </div>
        <p className="text-sm text-neutral-600 mb-4">{est.description}</p>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-neutral-100 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px',
                activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {tab.label}
              <span className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {activeTab === 'servicos' && (
          <div className="space-y-3">
            {estServices.length === 0 ? (
              <EmptyState emoji="🔧" title="Nenhum serviço cadastrado" />
            ) : (
              estServices.map((svc) => (
                <div key={svc.id} className="bg-white rounded-xl border border-neutral-100 p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900">{svc.name}</p>
                    <p className="text-sm text-neutral-400 mt-0.5 line-clamp-2">{svc.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                      <span>⏱ {svc.duration >= 60 ? `${Math.round(svc.duration / 60)}h` : `${svc.duration}min`}</span>
                      <span className="capitalize">📂 {categoryLabels[svc.category] || svc.category}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-orange-600">R${svc.price.toFixed(2)}</p>
                    <button
                      onClick={() => navigate('/tutor/booking')}
                      className="mt-2 px-4 py-1.5 bg-orange-500 text-white text-xs rounded-xl font-medium hover:bg-orange-600 transition-colors"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'fotos' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {est.photos.length === 0 ? (
              <EmptyState emoji="📷" title="Nenhuma foto" className="col-span-3" />
            ) : (
              est.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden">
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'avaliacoes' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-neutral-900">{est.rating}</p>
                  <div className="flex text-amber-400 justify-center mt-1">{'★'.repeat(5)}</div>
                  <p className="text-xs text-neutral-400 mt-1">{est.reviewCount} avaliações</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const pct = star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 7 : star === 2 ? 2 : 1;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 w-2">{star}</span>
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-neutral-400 w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {estReviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-xl border border-neutral-100 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <img src={rev.userAvatar} alt={rev.userName} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="font-medium text-sm text-neutral-900">{rev.userName}</p>
                    <div className="flex text-amber-400 text-xs">{'★'.repeat(rev.rating)}</div>
                    <p className="text-xs text-neutral-400">{new Date(rev.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600">{rev.comment}</p>
                {rev.reply && (
                  <div className="mt-3 pl-3 border-l-2 border-orange-200">
                    <p className="text-xs font-medium text-orange-600 mb-1">Resposta do estabelecimento</p>
                    <p className="text-xs text-neutral-500">{rev.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profissionais' && (
          <div className="space-y-3">
            {estProfessionals.map((prof) => (
              <div
                key={prof.id}
                onClick={() => navigate(`/tutor/profissionais/${prof.id}`)}
                className="bg-white rounded-xl border border-neutral-100 p-4 flex items-start gap-4 cursor-pointer hover:border-orange-100 transition-all"
              >
                <img src={prof.avatar} alt={prof.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">{prof.name}</p>
                  <p className="text-sm text-neutral-400">{prof.specialty.join(', ')}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-neutral-700">{prof.rating}</span>
                    <span className="text-xs text-neutral-400">({prof.reviewCount})</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/tutor/booking'); }}
                  className="px-3 py-2 bg-orange-50 text-orange-600 text-xs rounded-xl font-medium hover:bg-orange-100 transition-colors shrink-0"
                >
                  Agendar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/tutor/booking')}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-200 transition-all"
        >
          Agendar serviço no {est.businessName.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
