import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, KeyRound, ArrowRight, CheckCircle2, Laugh } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

interface EasterEggUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}

const alternatives = [
  { letter: 'A', name: 'Laura Laganá' },
  { letter: 'B', name: 'Almir Souza' },
  { letter: 'C', name: 'Cláudio Petry' },
  { letter: 'D', name: 'Robson Ferreira' },
  { letter: 'E', name: 'Marcelo Rossi' },
];

export const EasterEggUnlockModal: React.FC<EasterEggUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelectOption = (letter: string) => {
    setSelectedOption(letter);
    setIsRevealed(true);
    try {
      sessionStorage.setItem('@PetHub:easterEggUnlocked', 'true');
    } catch {
      // ignore storage errors
    }
  };

  const handleEnterGallery = () => {
    onClose();
    if (onUnlocked) onUnlocked();
    navigate('/tutor/easter-egg');
  };

  const handleResetAndClose = () => {
    setIsRevealed(false);
    setSelectedOption(null);
    setSecretCode('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden text-neutral-900 dark:text-neutral-100"
        >
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {!isRevealed ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 text-2xl mb-1 shadow-xs">
                  👀
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Área secreta 👀</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Apenas os dignos podem prosseguir. Responda à pergunta confidencial para destravar.
                </p>
              </div>

              {/* Pergunta */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">
                  Desafio de Acesso
                </p>
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  Qual o nome do diretor do Centro Paula Souza?
                </p>
              </div>

              {/* Alternativas */}
              <div className="space-y-2.5">
                {alternatives.map(({ letter, name }) => (
                  <button
                    key={letter}
                    onClick={() => handleSelectOption(letter)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 text-left transition-all cursor-pointer group shadow-xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        {letter}
                      </span>
                      <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                        {name}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400 group-hover:text-orange-500 transition-colors font-medium">
                      Escolher →
                    </span>
                  </button>
                ))}
              </div>

              {/* Campo decorativo de código */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={13} />
                  Senha / Código secreto (opcional)
                </label>
                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Se você souber o código secreto..."
                  className="w-full text-xs py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 text-4xl shadow-inner animate-bounce">
                👌
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2">
                  <p className="text-lg font-extrabold text-amber-900 dark:text-amber-200 leading-snug">
                    KKKKKK todas estavam certas bobinho 👌👌
                  </p>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    eu também não sei isso 😂
                  </p>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Acesso liberado com louvor. Bem-vindo aos bastidores do PetHub!
                </p>
              </div>

              <Button
                onClick={handleEnterGallery}
                size="lg"
                fullWidth
                rightIcon={<ArrowRight size={18} />}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/20"
              >
                Abrir Galeria Secreta 🎉
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
