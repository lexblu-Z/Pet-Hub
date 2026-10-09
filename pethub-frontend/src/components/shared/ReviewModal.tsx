import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { api } from '@/services/api';
import { useToastStore } from '@/store/toastStore';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetName: string;
  orderId?: string;
  appointmentId?: string;
}

const RATING_LABELS = ['', 'Muito Ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetName,
  orderId,
  appointmentId,
}) => {
  const { addToast } = useToastStore();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || rating < 1 || rating > 5) {
      addToast({
        type: 'error',
        title: 'Selecione uma nota',
        message: 'Por favor, selecione de 1 a 5 estrelas.',
      });
      return;
    }

    if (comment.trim().length < 3) {
      addToast({
        type: 'error',
        title: 'Comentário muito curto',
        message: 'Por favor, escreva pelo menos 3 caracteres no comentário.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/reviews', {
        orderId: orderId || undefined,
        appointmentId: appointmentId || undefined,
        rating,
        comment: comment.trim(),
      });

      setIsSuccess(true);
      addToast({
        type: 'success',
        title: 'Avaliação enviada com sucesso!',
        message: 'Obrigado pelo seu feedback.',
      });

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setIsSuccess(false);
        setComment('');
        setRating(5);
        onClose();
      }, 1500);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao enviar avaliação',
        message: error.response?.data?.error || 'Não foi possível registrar sua avaliação.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-neutral-200 dark:border-[#313335] overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#313335]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Star size={18} className="fill-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {orderId ? 'Avaliar Compra' : 'Avaliar Atendimento'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{targetName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">Avaliação registrada!</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Sua opinião foi compartilhada e ajuda outros tutores.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Star rating selector */}
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Sua nota
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-hidden transition-transform hover:scale-115 active:scale-95"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          star <= activeRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-300 dark:text-neutral-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {activeRating > 0 && (
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {RATING_LABELS[activeRating]}
                  </p>
                )}
              </div>

              {/* Comment field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Seu comentário
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte como foi sua experiência, o que achou dos produtos e do atendimento..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-1">
                  <span>Mínimo de 3 caracteres</span>
                  <span>{comment.length}/1000</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  {isSubmitting ? 'Enviando...' : 'Publicar Avaliação'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
