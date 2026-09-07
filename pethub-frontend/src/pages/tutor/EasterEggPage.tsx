import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Film,
  Camera,
  Grid,
  ShieldAlert,
  Eye,
  PawPrint,
} from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui';
import { EasterEggUnlockModal } from '@/components/shared/EasterEggUnlockModal';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'carousel';
  title: string;
  url?: string;
  cover?: string;
  items?: string[];
  count?: number;
}

export default function EasterEggPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'carousel' | 'video' | 'image'>('all');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Active Lightbox Modal states
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    // Check if unlocked in session
    const unlocked = sessionStorage.getItem('@PetHub:easterEggUnlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    } else {
      setShowUnlockModal(true);
    }
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/easter-egg');
      if (res.data?.items) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error('Erro ao carregar easter egg:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeItem) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (activeItem.type === 'carousel' && activeItem.items) {
        if (e.key === 'ArrowLeft') {
          prevCarouselSlide();
        } else if (e.key === 'ArrowRight') {
          nextCarouselSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, carouselIndex]);

  const openLightbox = (item: MediaItem) => {
    setActiveItem(item);
    setCarouselIndex(0);
  };

  const closeLightbox = () => {
    setActiveItem(null);
    setCarouselIndex(0);
  };

  const nextCarouselSlide = () => {
    if (!activeItem?.items) return;
    setCarouselIndex((prev) => (prev + 1) % activeItem.items!.length);
  };

  const prevCarouselSlide = () => {
    if (!activeItem?.items) return;
    setCarouselIndex((prev) => (prev - 1 + activeItem.items!.length) % activeItem.items!.length);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swiped left -> Next
        nextCarouselSlide();
      } else {
        // Swiped right -> Prev
        prevCarouselSlide();
      }
    }
    touchStartX.current = null;
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/tutor/profile')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-orange-500 shrink-0" />
                <h1 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                  Galeria Secreta
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                  Secreto
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Mural confidencial • Memes, carrosséis e bastidores
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUnlockModal(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Eye size={14} /> Rever Pergunta
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-3 pt-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all' as const, label: 'Tudo', count: items.length },
            {
              id: 'carousel' as const,
              label: 'Carrosséis',
              icon: Layers,
              count: items.filter((i) => i.type === 'carousel').length,
            },
            {
              id: 'video' as const,
              label: 'Vídeos',
              icon: Film,
              count: items.filter((i) => i.type === 'video').length,
            },
            {
              id: 'image' as const,
              label: 'Fotos',
              icon: Camera,
              count: items.filter((i) => i.type === 'image').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.icon && <tab.icon size={13} />}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filter === tab.id
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-neutral-900'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-3xl animate-pulse break-inside-avoid"
                style={{ height: `${200 + (i % 4) * 60}px` }}
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
              <PawPrint size={24} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Nenhum item nesta categoria
            </h3>
            <p className="text-sm text-neutral-500 mt-1">Selecione "Tudo" para ver todos os arquivos.</p>
          </div>
        ) : (
          /* MASONRY FEED (Pinterest Style) */
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id + idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.5) }}
                onClick={() => openLightbox(item)}
                className="group relative rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer break-inside-avoid mb-4"
              >
                {/* 1. CAROUSEL CARD */}
                {item.type === 'carousel' && (
                  <div className="relative">
                    <img
                      src={item.cover}
                      alt={item.title}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Carousel Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                      <Layers size={13} className="text-orange-400" />
                      <span>1/{item.count || item.items?.length || 1}</span>
                    </div>

                    {/* Gradient Overlay & Title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-0.5">
                        <Layers size={14} />
                        <span>Carrossel de Fotos</span>
                      </div>
                      <p className="text-sm font-bold truncate">{item.title}</p>
                      <p className="text-[11px] text-white/70">Clique para folhear os slides</p>
                    </div>
                  </div>
                )}

                {/* 2. VIDEO CARD */}
                {item.type === 'video' && (
                  <div className="relative bg-black">
                    <video
                      src={item.url}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.play().catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.pause();
                        target.currentTime = 0;
                      }}
                    />

                    {/* Video Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                      <Play size={11} className="fill-orange-400 text-orange-400" />
                      <span>Vídeo</span>
                    </div>

                    {/* Center Play Icon on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-orange-500 transition-all shadow-lg">
                        <Play size={20} className="fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Footer text on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                      <p className="text-xs font-bold text-orange-400">Vídeo PetHub</p>
                      <p className="text-xs text-white/70">Clique para reproduzir com áudio</p>
                    </div>
                  </div>
                )}

                {/* 3. SINGLE IMAGE CARD */}
                {item.type === 'image' && (
                  <div className="relative">
                    <img
                      src={item.url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                      <p className="text-xs font-bold text-orange-400">PetHub Galeria</p>
                      <p className="text-xs text-white/80">Clique para ampliar</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* LIGHTBOX / CAROUSEL / VIDEO MODAL */}
      <AnimatePresence>
        {activeItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 md:p-6"
            onClick={closeLightbox}
          >
            {/* Top Bar Controls */}
            <div
              className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-orange-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeItem.type === 'carousel'
                      ? `${activeItem.title} (${carouselIndex + 1}/${activeItem.items?.length || 1})`
                      : activeItem.type === 'video'
                      ? 'Vídeo PetHub'
                      : 'Foto PetHub'}
                  </h3>
                  <p className="text-[11px] text-white/60">Pressione ESC para fechar</p>
                </div>
              </div>

              <button
                onClick={closeLightbox}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar (ESC)"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Content Box */}
            <div
              className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* CAROUSEL VIEWER */}
              {activeItem.type === 'carousel' && activeItem.items && (
                <div className="relative flex flex-col items-center justify-center w-full">
                  <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl">
                    <motion.img
                      key={carouselIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      src={activeItem.items[carouselIndex]}
                      alt={`Slide ${carouselIndex + 1}`}
                      className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
                    />

                    {/* Navigation Arrows */}
                    {activeItem.items.length > 1 && (
                      <>
                        <button
                          onClick={prevCarouselSlide}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-lg cursor-pointer"
                          title="Anterior (Seta Esquerda)"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={nextCarouselSlide}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-lg cursor-pointer"
                          title="Próximo (Seta Direita)"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Carousel Indicators / Dots */}
                  <div className="mt-4 flex items-center gap-2">
                    {activeItem.items.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIndex(i)}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${
                          carouselIndex === i
                            ? 'w-7 bg-orange-500'
                            : 'w-2.5 bg-white/40 hover:bg-white/70'
                        }`}
                        title={`Ir para foto ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* VIDEO VIEWER */}
              {activeItem.type === 'video' && activeItem.url && (
                <div className="w-full max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
                  <video
                    src={activeItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[75vh] max-w-full rounded-2xl bg-black"
                  />
                </div>
              )}

              {/* SINGLE IMAGE VIEWER */}
              {activeItem.type === 'image' && activeItem.url && (
                <div className="w-full max-h-[75vh] flex items-center justify-center">
                  <img
                    src={activeItem.url}
                    alt={activeItem.title}
                    className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlock Challenge Modal */}
      <EasterEggUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onUnlocked={() => setIsUnlocked(true)}
      />
    </div>
  );
}
