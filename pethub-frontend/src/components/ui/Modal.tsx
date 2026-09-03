import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

// ---- Modal ----
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideClose?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-4xl',
  full: 'sm:max-w-[95vw] m-2',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideClose = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className={[
              'relative z-10 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden',
              'w-full',
              sizeClasses[size],
              'max-h-[90vh] flex flex-col',
            ].join(' ')}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between p-5 pb-3 border-b border-neutral-100">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors ml-4 shrink-0"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="overflow-y-auto flex-1 p-5">{children}</div>

            {footer && (
              <div className="p-5 pt-3 border-t border-neutral-100">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ---- Confirm Modal ----
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) => {
  const icons = {
    danger: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" hideClose>
      <div className="text-center py-2">
        <div className="text-4xl mb-4">{icons[variant]}</div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-6">{description || message}</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} fullWidth>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            fullWidth
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
