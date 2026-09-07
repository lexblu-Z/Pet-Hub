import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { useToastStore } from '@/store/toastStore';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'USER' | 'ESTABLISHMENT' | 'PROFESSIONAL';
  reportedUserId?: string;
  reportedEstablishmentId?: string;
  targetName: string;
}

const REPORT_REASONS = [
  'Comportamento inadequado',
  'Informações falsas',
  'Conteúdo impróprio',
  'Fraude / Atividade suspeita',
  'Assédio ou desrespeito',
  'Outro motivo',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  reportedUserId,
  reportedEstablishmentId,
  targetName,
}) => {
  const { addToast } = useToastStore();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      addToast({
        type: 'error',
        title: 'Descrição muito curta',
        message: 'Por favor, descreva o problema com pelo menos 10 caracteres.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/reports/profile', {
        targetType,
        reportedUserId,
        reportedEstablishmentId,
        reason,
        description: description.trim(),
      });

      setIsSuccess(true);
      addToast({
        type: 'success',
        title: 'Denúncia enviada',
        message: 'Nossa equipe irá analisar o caso com prioridade.',
      });

      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        setReason(REPORT_REASONS[0]);
        onClose();
      }, 2000);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao enviar',
        message: error.response?.data?.error || 'Não foi possível registrar a denúncia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-neutral-200 dark:border-[#313335] overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#313335]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flag size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Denunciar perfil</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{targetName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">Denúncia enviada</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Nossa equipe de moderação irá analisar os fatos e tomar as medidas cabíveis.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Motivo da denúncia
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Descreva o problema
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique detalhadamente o ocorrido..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 resize-none"
                />
                <span className="text-[11px] text-neutral-400">Mínimo de 10 caracteres</span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Sua denúncia é confidencial e será analisada com base nas diretrizes da comunidade do PetHub.
                </span>
              </div>

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
                  className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar denúncia'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
