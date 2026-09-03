import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Search, Star, MapPin, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { api } from '@/services/api';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load favorites from API or localStorage
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        // If there's a real favorites endpoint or stored IDs
        const savedIds = JSON.parse(localStorage.getItem('@PetHub:favorites') || '[]');
        if (savedIds.length > 0) {
          const response = await api.get('/establishments');
          const favList = response.data.filter((e: any) => savedIds.includes(e.id));
          setFavorites(favList);
        } else {
          setFavorites([]);
        }
      } catch (error) {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemoveFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    const savedIds = JSON.parse(localStorage.getItem('@PetHub:favorites') || '[]');
    localStorage.setItem('@PetHub:favorites', JSON.stringify(savedIds.filter((favId: string) => favId !== id)));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Heart size={24} className="text-red-500 fill-red-500" />
            Meus Favoritos
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Estabelecimentos e pet shops que você salvou
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Search size={16} />}
          onClick={() => navigate('/tutor/explore')}
        >
          Explorar locais
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card padding="lg" className="text-center py-16 border border-neutral-100 shadow-sm">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ❤️
          </div>
          <h2 className="text-lg font-bold text-neutral-800 mb-1">
            Você ainda não favoritou nenhum estabelecimento
          </h2>
          <p className="text-neutral-500 text-sm max-w-md mx-auto mb-6">
            Explore estabelecimentos, pet shops e veterinários e toque no coração para salvar seus favoritos aqui.
          </p>
          <Button
            size="md"
            rightIcon={<ArrowRight size={16} />}
            onClick={() => navigate('/tutor/explore')}
          >
            Explorar estabelecimentos
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {favorites.map((est) => (
            <motion.div
              key={est.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(`/tutor/estabelecimentos/${est.id}`)}
            >
              <div className="relative h-28 bg-neutral-900 overflow-hidden">
                {est.cover ? (
                  <img
                    src={est.cover}
                    alt={est.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <video
                    src="/user_estabelecimento.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                )}
                <button
                  onClick={(e) => handleRemoveFavorite(est.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-white shadow transition-transform hover:scale-110"
                  title="Remover dos favoritos"
                >
                  <Heart size={16} className="fill-red-500" />
                </button>
              </div>
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-100 shrink-0 bg-neutral-900 relative">
                  {est.logo ? (
                    <img
                      src={est.logo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src="/user_estabelecimento.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-neutral-900 truncate">{est.name}</h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={12} className="shrink-0" />
                    {est.address || 'Endereço disponível no perfil'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
