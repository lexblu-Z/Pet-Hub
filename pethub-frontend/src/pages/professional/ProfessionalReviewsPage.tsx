import React from 'react';
import { Star, MessageSquare, ThumbsUp, User } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';

export default function ProfessionalReviewsPage() {
  const reviews = [
    {
      id: '1',
      tutor: 'Mariana Silva',
      tutorPhoto: '/user.jpg',
      pet: 'Thor (Golden Retriever)',
      rating: 5,
      date: '01/09/2026',
      comment: 'Excelente veterinário! Muito atencioso com o Thor, tirou todas as dúvidas e passou muita tranquilidade na consulta.',
    },
    {
      id: '2',
      tutor: 'Carlos Eduardo',
      tutorPhoto: '/user.jpg',
      pet: 'Luna (Gato Siamês)',
      rating: 5,
      date: '28/08/2026',
      comment: 'Atendimento muito carinhoso, minha gata que costuma ter medo ficou super calma durante todo o procedimento vacinal.',
    },
    {
      id: '3',
      tutor: 'Ana Beatriz',
      tutorPhoto: '/user.jpg',
      pet: 'Bob (Poodle)',
      rating: 5,
      date: '15/08/2026',
      comment: 'Profissional impecável. Explicou em detalhes o diagnóstico ortopédico e indicou o tratamento mais adequado.',
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Avaliações dos Clientes</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Feedback e comentários de tutores atendidos no PetHub</p>
      </div>

      {/* Summary Score Card - Premium Dark & Orange */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-black text-white">5.0</div>
            <div className="flex items-center justify-center gap-1 text-amber-400 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-amber-400" />
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Baseado em {reviews.length} avaliações</p>
          </div>
          <div className="h-14 w-px bg-neutral-800 hidden sm:block" />
          <div className="space-y-1 text-xs text-neutral-300">
            <p className="font-semibold text-white">100% de recomendações positivas</p>
            <p className="text-neutral-400">Atendimento humanizado, pontualidade e clareza nas orientações médicas aos tutores.</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-orange-200 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar src={r.tutorPhoto || '/user.jpg'} name={r.tutor} size="md" />
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
    </div>
  );
}
