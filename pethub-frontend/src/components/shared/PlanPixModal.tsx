import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

interface PlanPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    price: number;
    establishmentName?: string;
  } | null;
  onSuccess?: (planId: string) => void;
}

export const PlanPixModal: React.FC<PlanPixModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) => {
  const { isAuthenticated } = useAuthStore();
  const toast = useToast();
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
  const [txId, setTxId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  // Generate new simulated transaction code
  const generateNewCode = () => {
    const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const newTxId = `pethub-sim-tx-${randomPart}-${timestamp}`;
    setTxId(newTxId);
    setTimeLeft(600);
    setCopied(false);
    setIsConfirmed(false);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (isOpen && plan) {
      generateNewCode();
    }
  }, [isOpen, plan?.id]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isConfirmed || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isConfirmed, timeLeft]);

  if (!isOpen || !plan || !isAuthenticated) return null;

  const isExpired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Simulated EMV string
  const pixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${txId}520400005303986540${plan.price.toFixed(2)}5802BR5915PETHUB BRASIL6008OURINHOS62070503***6304${txId.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSimulatePayment = async () => {
    if (!isAuthenticated) {
      toast.error('Autenticação necessária para simular contratação.');
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      await api.post('/plans/simulate', { planId: plan.id });
      setIsConfirmed(true);
      if (onSuccess) {
        onSuccess(plan.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao validar simulação de plano no servidor.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Pagamento via Pix
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {plan.name} · R$ {plan.price.toFixed(2).replace('.', ',')}/mês
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Simulation Environment Notice */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Modo de Simulação Ativo:</span> Este ambiente permite testar o fluxo de adesão e expiração de Pix. Nenhuma cobrança real será efetuada em sua conta bancária.
          </div>
        </div>

        {/* Confirmed State */}
        {isConfirmed ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                Pagamento Simulado com Sucesso!
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                A assinatura do <strong>{plan.name}</strong> foi ativada em modo de demonstração.
              </p>
            </div>
            <div className="p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-2xl border border-neutral-100 dark:border-[#313335] text-xs text-neutral-600 dark:text-neutral-300 max-w-xs mx-auto text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Identificador:</span>
                <span className="font-mono font-bold text-[11px]">{txId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Valor:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">CONFIRMADO (SIMULAÇÃO)</span>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="primary" fullWidth onClick={onClose} className="font-semibold">
                Concluir
              </Button>
            </div>
          </div>
        ) : isExpired ? (
          /* Expired State */
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <Clock size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                Este código Pix expirou
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                O prazo de 10 minutos para pagamento foi ultrapassado. Por motivos de segurança bancária simulada, gere um novo código para prosseguir.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={generateNewCode}
                className="font-semibold flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={15} />
                <span>Gerar novo código Pix</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Active Payment Code State */
          <div className="space-y-5">
            {/* Timer countdown */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-[#131314] rounded-2xl border border-neutral-100 dark:border-[#313335]">
              <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                <Clock size={15} className="text-orange-500" />
                <span>Tempo restante para pagar:</span>
              </div>
              <span className={`font-mono text-sm font-bold ${
                timeLeft < 120 ? 'text-rose-500 animate-pulse' : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formattedTime}
              </span>
            </div>

            {/* Simulated Vector QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-[#18191B] rounded-2xl border border-neutral-200 dark:border-[#313335]">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-neutral-200/80 inline-block">
                <svg
                  viewBox="0 0 220 220"
                  className="w-44 h-44 aspect-square block text-neutral-900"
                  fill="currentColor"
                >
                {/* Top-Left Finder */}
                <rect x="10" y="10" width="60" height="60" rx="6" fill="black" />
                <rect x="20" y="20" width="40" height="40" rx="3" fill="white" />
                <rect x="28" y="28" width="24" height="24" rx="2" fill="black" />

                {/* Top-Right Finder */}
                <rect x="150" y="10" width="60" height="60" rx="6" fill="black" />
                <rect x="160" y="20" width="40" height="40" rx="3" fill="white" />
                <rect x="168" y="28" width="24" height="24" rx="2" fill="black" />

                {/* Bottom-Left Finder */}
                <rect x="10" y="150" width="60" height="60" rx="6" fill="black" />
                <rect x="20" y="160" width="40" height="40" rx="3" fill="white" />
                <rect x="28" y="168" width="24" height="24" rx="2" fill="black" />

                {/* Simulated Data Pattern Matrix */}
                <g fill="black">
                  <rect x="80" y="15" width="8" height="8" />
                  <rect x="95" y="15" width="16" height="8" />
                  <rect x="120" y="15" width="12" height="8" />
                  <rect x="80" y="30" width="12" height="8" />
                  <rect x="105" y="30" width="8" height="8" />
                  <rect x="125" y="30" width="14" height="8" />
                  <rect x="85" y="45" width="20" height="8" />
                  <rect x="115" y="45" width="16" height="8" />
                  <rect x="80" y="60" width="10" height="8" />
                  <rect x="100" y="60" width="14" height="8" />
                  <rect x="125" y="60" width="10" height="8" />

                  <rect x="15" y="80" width="14" height="8" />
                  <rect x="35" y="80" width="18" height="8" />
                  <rect x="60" y="80" width="12" height="8" />
                  <rect x="80" y="80" width="20" height="8" />
                  <rect x="110" y="80" width="15" height="8" />
                  <rect x="135" y="80" width="10" height="8" />
                  <rect x="155" y="80" width="20" height="8" />
                  <rect x="185" y="80" width="25" height="8" />

                  <rect x="15" y="95" width="20" height="8" />
                  <rect x="45" y="95" width="10" height="8" />
                  <rect x="65" y="95" width="25" height="8" />
                  <rect x="100" y="95" width="18" height="8" />
                  <rect x="130" y="95" width="12" height="8" />
                  <rect x="150" y="95" width="15" height="8" />
                  <rect x="175" y="95" width="30" height="8" />

                  <rect x="20" y="110" width="15" height="8" />
                  <rect x="45" y="110" width="25" height="8" />
                  <rect x="80" y="110" width="12" height="8" />
                  <rect x="105" y="110" width="20" height="8" />
                  <rect x="135" y="110" width="15" height="8" />
                  <rect x="160" y="110" width="10" height="8" />
                  <rect x="180" y="110" width="25" height="8" />

                  <rect x="15" y="125" width="30" height="8" />
                  <rect x="55" y="125" width="15" height="8" />
                  <rect x="80" y="125" width="18" height="8" />
                  <rect x="110" y="125" width="22" height="8" />
                  <rect x="140" y="125" width="12" height="8" />
                  <rect x="160" y="125" width="20" height="8" />
                  <rect x="190" y="125" width="15" height="8" />

                  <rect x="80" y="150" width="15" height="8" />
                  <rect x="105" y="150" width="20" height="8" />
                  <rect x="135" y="150" width="10" height="8" />
                  <rect x="155" y="150" width="25" height="8" />
                  <rect x="190" y="150" width="15" height="8" />

                  <rect x="85" y="165" width="25" height="8" />
                  <rect x="120" y="165" width="15" height="8" />
                  <rect x="145" y="165" width="20" height="8" />
                  <rect x="175" y="165" width="30" height="8" />

                  <rect x="80" y="180" width="12" height="8" />
                  <rect x="100" y="180" width="15" height="8" />
                  <rect x="125" y="180" width="25" height="8" />
                  <rect x="160" y="180" width="18" height="8" />
                  <rect x="185" y="180" width="20" height="8" />

                  <rect x="85" y="195" width="20" height="8" />
                  <rect x="115" y="195" width="15" height="8" />
                  <rect x="140" y="195" width="30" height="8" />
                  <rect x="180" y="195" width="25" height="8" />
                </g>
              </svg>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono mt-2.5">
              ID da transação: {txId}
            </p>
          </div>

            {/* Pix Copia e Cola */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Pix Copia e Cola
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixCopiaECola}
                  className="flex-1 bg-neutral-50 dark:bg-[#131314] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 focus:outline-none truncate select-all"
                />
                <Button
                  variant={copied ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 text-xs font-semibold flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar código</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="font-bold flex items-center justify-center gap-2 py-3 shadow-sm"
              >
                {isProcessing ? (
                  <span>Processando simulação...</span>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Simular Confirmação do Pagamento</span>
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">
                Ao simular, a assinatura do plano será vinculada no sistema imediatamente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
