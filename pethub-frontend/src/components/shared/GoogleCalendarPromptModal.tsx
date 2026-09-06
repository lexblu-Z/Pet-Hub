import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface GoogleCalendarPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDismissSession: () => void;
  onNeverShowAgain: () => void;
  isLoading?: boolean;
}

export const GoogleCalendarPromptModal: React.FC<GoogleCalendarPromptModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDismissSession,
  onNeverShowAgain,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#1E1F20] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-neutral-100 dark:border-[#313335] relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onDismissSession}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-500 dark:text-[#C4C7C5] flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={16} />
          </button>

          {/* Header Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center text-orange-500 shrink-0 shadow-xs">
              <Calendar size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/60 px-2.5 py-0.5 rounded-full">
                Integração Opcional
              </span>
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-[#E3E3E3] mt-0.5">
                Sincronizar com Google Calendar?
              </h3>
            </div>
          </div>

          {/* Body */}
          <p className="text-neutral-600 dark:text-[#C4C7C5] text-sm leading-relaxed mb-5">
            Você pode sincronizar seus agendamentos do <strong className="text-neutral-900 dark:text-white">PetHub</strong> diretamente com o seu <strong className="text-neutral-900 dark:text-white">Google Calendar</strong> para visualizá-los na sua agenda pessoal e receber alertas automáticos no celular.
          </p>

          <div className="space-y-2.5 p-3.5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100/80 dark:border-[#313335] mb-6 text-xs text-neutral-600 dark:text-[#C4C7C5]">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Criação automática dos eventos com nome do pet, serviço e local.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Atualização em tempo real caso haja alteração de horário ou cancelamento.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={15} className="text-blue-500 shrink-0 mt-0.5" />
              <span>Totalmente opcional: você pode conectar ou desconectar quando quiser.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={onConnect}
              isLoading={isLoading}
              fullWidth
              size="md"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-sm shadow-md"
            >
              Sim, conectar Google Calendar
            </Button>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={onDismissSession}
                fullWidth
                size="sm"
                className="text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#282A2C] font-semibold text-xs"
              >
                Agora não
              </Button>

              <button
                onClick={onNeverShowAgain}
                className="w-full text-center text-xs text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3] py-2 transition-colors font-medium underline underline-offset-2 cursor-pointer"
              >
                Não exibir novamente
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
