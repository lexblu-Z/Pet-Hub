import React, { useState } from 'react';
import { 
  CreditCard, DollarSign, Tag, CheckCircle, X, AlertCircle, Info, Sparkles, ArrowRight 
} from 'lucide-react';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

export interface PaymentMethodSelectorProps {
  type: 'PRODUCT' | 'SERVICE';
  subtotal: number;
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  needsChange: boolean;
  onToggleNeedsChange: (needs: boolean) => void;
  changeFor: string;
  onChangeForChange: (val: string) => void;
  appliedCashbackCode: string | null;
  cashbackDiscount: number;
  onApplyCashback: (code: string | null, discount: number) => void;
  showBreakdown?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  type,
  subtotal,
  selectedMethod,
  onSelectMethod,
  needsChange,
  onToggleNeedsChange,
  changeFor,
  onChangeForChange,
  appliedCashbackCode,
  cashbackDiscount,
  onApplyCashback,
  showBreakdown = true,
}) => {
  const toast = useToast();
  const [inputCode, setInputCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const finalAmount = Math.max(0, Math.round((subtotal - cashbackDiscount) * 100) / 100);
  const isCash = selectedMethod.toLowerCase().includes('dinheiro') || selectedMethod.toUpperCase() === 'CASH';

  // Format code as PHB-XXXX-XXXX-XXXX
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.startsWith('PHB')) {
      raw = raw.slice(3);
    }
    raw = raw.slice(0, 12);
    
    let formatted = 'PHB';
    for (let i = 0; i < raw.length; i++) {
      if (i % 4 === 0) formatted += '-';
      formatted += raw[i];
    }
    
    setInputCode(formatted === 'PHB' ? '' : formatted);
    setCodeError(null);
  };

  const handleValidateAndApply = async () => {
    if (!inputCode.trim()) {
      setCodeError('Digite o código de cashback');
      return;
    }

    try {
      setIsValidatingCode(true);
      setCodeError(null);
      const res = await api.post('/cashback/validate', { code: inputCode.trim() });
      
      if (res.data?.valid && res.data?.voucher) {
        const voucher = res.data.voucher;
        const discount = Math.min(voucher.amount, subtotal);
        onApplyCashback(voucher.code, discount);
        setInputCode('');
        toast.success(`Código aplicado com sucesso! Desconto de R$ ${discount.toFixed(2).replace('.', ',')}`);
      } else {
        setCodeError(res.data?.message || 'Código de cashback inválido.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Código inválido ou já utilizado.';
      setCodeError(msg);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveCashback = () => {
    onApplyCashback(null, 0);
    toast.info('Código de cashback removido.');
  };

  // Troco calculations
  const parsedChange = parseFloat(changeFor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'));
  const hasInvalidChange = isCash && needsChange && (!parsedChange || parsedChange < finalAmount);
  const calculatedChangeToReturn = !isNaN(parsedChange) && parsedChange >= finalAmount 
    ? (parsedChange - finalAmount).toFixed(2).replace('.', ',') 
    : null;

  // Expected cashback to earn on completion
  const rate = type === 'SERVICE' ? 0.05 : 0.03;
  const rateLabel = type === 'SERVICE' ? '5%' : '3%';
  const expectedCashback = Math.round(finalAmount * rate * 100) / 100;

  return (
    <div className="space-y-4">
      {/* Notice info */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40 flex items-start gap-3 text-xs text-blue-950 dark:text-blue-200">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-0.5">Pagamento Presencial no Local / Balcão</p>
          <p className="text-[11px] leading-relaxed text-blue-900/80 dark:text-blue-300/80">
            {type === 'SERVICE'
              ? 'O pagamento do serviço é realizado no estabelecimento ou diretamente com o profissional. Nenhum dado sensível de cartão é transacionado online.'
              : 'O pagamento é feito na entrega ou retirada. Para entrega por motoboy, ele levará a maquininha quando aplicável.'}
          </p>
        </div>
      </div>

      {/* Payment methods selector */}
      <div>
        <label className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] uppercase tracking-wider block mb-2">
          Escolha a forma de pagamento:
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: 'Cartão de Débito', label: 'Cartão de Débito', desc: 'Maquininha no local' },
            { id: 'Cartão de Crédito', label: 'Cartão de Crédito', desc: 'Maquininha no local' },
            { id: 'Pix', label: 'Pix', desc: 'Chave presencial / balcão' },
            { id: 'Dinheiro', label: 'Dinheiro', desc: 'Pagamento em espécie' },
          ].map((p) => {
            const isSelected = selectedMethod.toLowerCase() === p.id.toLowerCase();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectMethod(p.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                    : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 flex items-center">
                    <PaymentLogo method={p.id} size="md" />
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <PaymentLogo method={p.id} size="xs" />
                    <p className="font-bold text-xs text-neutral-900 dark:text-[#E3E3E3]">{p.label}</p>
                  </div>
                  <p className="text-[10px] text-neutral-400 dark:text-[#8E918F] mt-0.5">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cash troco calculator */}
      {isCash && (
        <div className="p-4 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3]">Precisa de troco?</span>
            <div className="flex gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onToggleNeedsChange(false)}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  !needsChange
                    ? 'bg-neutral-900 dark:bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#1E1F20] text-neutral-600 dark:text-[#C4C7C5] border border-neutral-200 dark:border-[#313335]'
                }`}
              >
                Não, valor exato
              </button>
              <button
                type="button"
                onClick={() => onToggleNeedsChange(true)}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  needsChange
                    ? 'bg-neutral-900 dark:bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#1E1F20] text-neutral-600 dark:text-[#C4C7C5] border border-neutral-200 dark:border-[#313335]'
                }`}
              >
                Sim, preciso
              </button>
            </div>
          </div>

          {needsChange && (
            <div className="pt-2 border-t border-neutral-200/50 dark:border-[#313335] space-y-2">
              <label className="text-[11px] text-neutral-600 dark:text-[#C4C7C5] font-medium block">
                Troco para quanto?
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 dark:text-[#8E918F]">R$</span>
                <input
                  type="text"
                  value={changeFor}
                  onChange={(e) => onChangeForChange(e.target.value)}
                  placeholder="Ex: 100,00"
                  className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Suggestions */}
              <div className="flex gap-1.5 pt-0.5 flex-wrap">
                {[20, 50, 100, 150, 200].filter(v => v > finalAmount).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeForChange(val.toFixed(2).replace('.', ','))}
                    className="text-[10px] px-2.5 py-1 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-lg text-neutral-600 dark:text-[#C4C7C5] hover:border-orange-400 cursor-pointer font-medium"
                  >
                    R$ {val},00
                  </button>
                ))}
              </div>

              {/* Troco Result / Error */}
              {hasInvalidChange && (
                <p className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1 font-medium pt-1">
                  <AlertCircle size={12} className="shrink-0" />
                  O valor deve ser maior ou igual a R$ {finalAmount.toFixed(2).replace('.', ',')}
                </p>
              )}

              {calculatedChangeToReturn && !hasInvalidChange && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between">
                  <span className="font-semibold">Troco a ser devolvido:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    R$ {calculatedChangeToReturn}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cashback Voucher Section */}
      <div className="p-4 bg-orange-50/50 dark:bg-[#282A2C] rounded-2xl border border-orange-200/60 dark:border-[#313335] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-[#E3E3E3]">
            <Tag size={14} className="text-orange-500" />
            <span>Cupom de Cashback PetHub</span>
          </div>
          <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
            Resgate no seu perfil
          </span>
        </div>

        {appliedCashbackCode ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-bold text-xs text-emerald-900 dark:text-emerald-200">
                  {appliedCashbackCode}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                Desconto aplicado de <strong>R$ {cashbackDiscount.toFixed(2).replace('.', ',')}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveCashback}
              className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              title="Remover código"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={handleCodeInputChange}
                placeholder="PHB-XXXX-XXXX-XXXX"
                className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl font-mono text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase"
              />
              <button
                type="button"
                onClick={handleValidateAndApply}
                disabled={isValidatingCode || !inputCode.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isValidatingCode ? 'Validando...' : 'Aplicar'}
              </button>
            </div>
            {codeError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" />
                {codeError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary Breakdown */}
      {showBreakdown && (
        <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] space-y-2 text-xs">
          <div className="flex justify-between text-neutral-600 dark:text-[#C4C7C5]">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>

          {cashbackDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Tag size={12} />
                Desconto Cashback
              </span>
              <span>- R$ {cashbackDiscount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-100 dark:border-[#313335] flex justify-between items-center text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
            <span>Total a pagar:</span>
            <span className="text-base text-orange-600 dark:text-orange-400">
              R$ {finalAmount.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Cashback earn incentive */}
          <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-[#313335] flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              <span>Cashback a receber ({rateLabel}):</span>
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-300">
              + R$ {expectedCashback.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
