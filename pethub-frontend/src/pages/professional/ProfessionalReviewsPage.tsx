import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { api } from '@/services/api';

interface Review {
  id: string;
  tutor: string;
  tutorPhoto: string | null;
  pet: string;
  rating: number;
  date: string;
  comment: string;
}

export default function ProfessionalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const res = await api.get('/professional/reviews');
        setReviews(res.data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Avaliações dos Clientes</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Feedback e comentários de tutores atendidos no PetHub</p>
      </div>

      {/* Summary Score Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-black text-neutral-900">
              {averageRating || '—'}
            </div>
            <div className="flex items-center justify-center gap-1 text-amber-400 mt-1">
              {averageRating ? (
                [...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))
              ) : (
                <span className="text-xs text-neutral-400 font-medium">Sem notas</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {reviews.length === 0 ? 'Ainda sem avaliações' : `Baseado em ${reviews.length} avaliação(ões)`}
            </p>
          </div>
          <div className="h-14 w-px bg-neutral-200 hidden sm:block" />
          <div className="space-y-1 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-900">
              {reviews.length > 0 ? 'Avaliações reais de tutores atendidos' : 'Nenhuma avaliação recebida até o momento'}
            </p>
            <p className="text-neutral-400">
              Assim que os tutores avaliarem seus atendimentos após as consultas, as notas e comentários aparecerão aqui.
            </p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando avaliações...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <Star size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Ainda não há avaliações registradas</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Após a realização e conclusão de atendimentos, os tutores poderão registrar notas e comentários sobre a experiência.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-orange-200 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={r.tutorPhoto || '/user.jpg'} name={r.tutor} size="md" fallbackSrc="/user.jpg" />
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm">{r.tutor}</h4>
                    <p className="text-xs text-neutral-400">Paciente: <span className="font-medium text-neutral-700">{r.pet}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">{r.date}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                "{r.comment}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
