import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-[#15231c] border-green-200 dark:border-green-800/60',
    iconColor: 'text-green-500 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-200',
    msgColor: 'text-green-600 dark:text-green-300',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-[#25171a] border-red-200 dark:border-red-800/60',
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-200',
    msgColor: 'text-red-600 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-[#261d15] border-amber-200 dark:border-amber-800/60',
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-800 dark:text-amber-200',
    msgColor: 'text-amber-600 dark:text-amber-300',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-[#151d2c] border-blue-200 dark:border-blue-800/60',
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-200',
    msgColor: 'text-blue-600 dark:text-blue-300',
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={[
                'pointer-events-auto w-full rounded-xl border shadow-lg p-4',
                'flex items-start gap-3 backdrop-blur-sm',
                config.bg,
              ].join(' ')}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${config.titleColor}`}>{toast.title}</p>
                {toast.message && (
                  <p className={`text-xs mt-0.5 ${config.msgColor}`}>{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
