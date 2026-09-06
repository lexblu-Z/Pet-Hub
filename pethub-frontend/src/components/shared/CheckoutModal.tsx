import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Truck, Store, CreditCard, DollarSign, Smartphone, CheckCircle, 
  ChevronRight, ArrowLeft, MapPin, Phone, Info, AlertTriangle, Search, Check
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: any) => void;
  cartItems: Array<{
    product: any;
    quantity: number;
  }>;
  totalAmount: number;
}

// Visual Graphics for Payment Methods
const DebitCardGraphic = () => (
  <div className="w-12 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-500 p-1.5 flex flex-col justify-between shadow-xs relative overflow-hidden border border-white/10 shrink-0">
    <div className="flex items-center justify-between">
      {/* Chip */}
      <div className="w-2.5 h-2 rounded-[2px] bg-amber-300/90 border border-amber-400/80" />
      {/* Contactless waves */}
      <div className="text-[7px] text-white/70 font-mono tracking-tighter">DÉBITO</div>
    </div>
    <div className="flex items-center justify-between text-[6px] font-mono text-white/80">
      <span>••••</span>
      <div className="w-3 h-2 rounded-[2px] bg-white/20" />
    </div>
  </div>
);

const CreditCardGraphic = () => (
  <div className="w-12 h-8 rounded-lg bg-gradient-to-tr from-indigo-700 via-purple-700 to-orange-500 p-1.5 flex flex-col justify-between shadow-xs relative overflow-hidden border border-white/10 shrink-0">
    <div className="flex items-center justify-between">
      {/* Chip */}
      <div className="w-2.5 h-2 rounded-[2px] bg-amber-300/90 border border-amber-400/80" />
      <div className="text-[7px] text-white/90 font-mono tracking-tighter">CRÉDITO</div>
    </div>
    <div className="flex items-center justify-between text-[6px] font-mono text-white/90">
      <span>••••</span>
      <div className="w-3 h-2 rounded-[2px] bg-white/30" />
    </div>
  </div>
);

const PixGraphic = () => (
  <div className="w-12 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 p-1 flex items-center justify-center shadow-xs shrink-0">
    {/* Official Pix Geometric Diamond Logo */}
    <svg viewBox="0 0 512 512" className="w-6 h-6 text-[#32BCAD] fill-current">
      <path d="M112.5 124.7l70.1 70.1c14.1 14.1 36.9 14.1 51 0l70.1-70.1c60.5-60.5 158.8-60.5 219.3 0l-51 51c-32.3-32.3-84.8-32.3-117.2 0l-70.1 70.1c-14.1 14.1-36.9 14.1-51 0l-70.1-70.1c-32.3-32.3-84.8-32.3-117.2 0l-51-51c60.5-60.5 158.8-60.5 219.3 0zM399.5 387.3l-70.1-70.1c-14.1-14.1-36.9-14.1-51 0l-70.1 70.1c-60.5 60.5-158.8 60.5-219.3 0l51-51c32.3 32.3 84.8 32.3 117.2 0l70.1-70.1c14.1-14.1 36.9-14.1 51 0l70.1 70.1c32.3 32.3 84.8 32.3 117.2 0l51 51c-60.5 60.5-158.8 60.5-219.3 0z" />
    </svg>
  </div>
);

const CashGraphic = () => (
  <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 p-1 flex flex-col justify-between shadow-xs border border-emerald-400/40 shrink-0 text-white">
    <div className="flex justify-between items-center text-[6px] font-bold tracking-wider">
      <span>R$</span>
      <span className="opacity-80">REAL</span>
    </div>
    <div className="flex items-center justify-center">
      <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center text-[7px] font-bold">
        $
      </div>
    </div>
    <div className="flex justify-end text-[5px] font-mono opacity-80">
      <span>100</span>
    </div>
  </div>
);

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cartItems,
  totalAmount,
}) => {
  const toast = useToast();
  const { currentUser } = useAuthStore();

  const [step, setStep] = useState<'RECEIVE' | 'PAYMENT' | 'REVIEW' | 'SUCCESS'>('RECEIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Step 1: Receiving Method
  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [deliverToDifferentAddress, setDeliverToDifferentAddress] = useState(false);

  // Default User Address from Profile
  const userStreet = typeof currentUser?.address === 'string' ? currentUser.address : (currentUser?.address as any)?.street || '';
  const userNumber = currentUser?.number || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.number : '') || '';
  const userComplement = currentUser?.complement || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.complement : '') || '';
  const userNeighborhood = currentUser?.neighborhood || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.neighborhood : '') || '';
  const userCity = currentUser?.city || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.city : '') || 'Ourinhos';
  const userState = currentUser?.state || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.state : '') || 'SP';
  const userZipCode = currentUser?.zipCode || (typeof currentUser?.address === 'object' ? (currentUser?.address as any)?.zipCode : '') || '';

  const hasRegisteredAddress = Boolean(userStreet && userNumber && userNeighborhood);

  // Alternative Address fields
  const [customAddress, setCustomAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Ourinhos',
    state: 'SP',
    zipCode: '',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [isCepLoading, setIsCepLoading] = useState(false);

  // Step 2: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<string>('Cartão de Débito');
  const [needsChange, setNeedsChange] = useState<boolean>(false);
  const [changeFor, setChangeFor] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Primary establishment info from first item
  const primaryEstablishment = cartItems[0]?.product?.establishment || null;
  const estabProfile = primaryEstablishment?.establishmentProfile || null;
  const sellerName = estabProfile?.businessName || primaryEstablishment?.name || 'Pet Shop Parceiro';
  const estabAddress = estabProfile?.address 
    ? `${estabProfile.address}, ${estabProfile.city || 'Ourinhos'} - ${estabProfile.state || 'SP'}`
    : 'Consulte o estabelecimento para detalhes de retirada.';
  const estabPhone = estabProfile?.phone || primaryEstablishment?.phone || '';

  useEffect(() => {
    if (isOpen) {
      setStep('RECEIVE');
      setCreatedOrder(null);
      setIsSubmitting(false);
      setDeliverToDifferentAddress(false);
      setAddressErrors({});
    }
  }, [isOpen]);

  const handleCepLookup = async (cep: string) => {
    let raw = cep.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    setCustomAddress(prev => ({ ...prev, zipCode: formatted }));

    if (raw.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await response.json();
        if (data.erro) {
          toast.error('CEP não encontrado.');
          return;
        }

        // Validate Ourinhos - SP restriction
        if (data.localidade?.trim().toLowerCase() !== 'ourinhos' || data.uf?.trim().toUpperCase() !== 'SP') {
          toast.error('O PetHub realiza entregas apenas em Ourinhos - SP.');
          setAddressErrors(prev => ({ ...prev, city: 'Entregas apenas em Ourinhos - SP' }));
          return;
        }

        setCustomAddress(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: 'Ourinhos',
          state: 'SP',
        }));
        setAddressErrors({});
      } catch {
        toast.error('Erro ao consultar CEP. Preencha o endereço manualmente.');
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const validateAddress = () => {
    if (deliveryMethod === 'PICKUP') return true;

    // If using default address
    if (!deliverToDifferentAddress) {
      if (!hasRegisteredAddress) {
        toast.error('Cadastre um endereço válido para receber por entrega.');
        return false;
      }
      return true;
    }

    // If using alternative address
    const errors: Record<string, string> = {};
    if (!customAddress.street.trim()) errors.street = 'Rua é obrigatória';
    if (!customAddress.number.trim()) errors.number = 'Número é obrigatório';
    if (!customAddress.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
    if (!customAddress.city.trim() || customAddress.city.toLowerCase() !== 'ourinhos') {
      errors.city = 'Entregas apenas em Ourinhos - SP';
    }
    if (!customAddress.state.trim() || customAddress.state.toUpperCase() !== 'SP') {
      errors.state = 'Estado deve ser SP';
    }
    const cleanCep = customAddress.zipCode.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      errors.zipCode = 'CEP válido com 8 dígitos é obrigatório';
    } else {
      const prefix = parseInt(cleanCep.slice(0, 5), 10);
      if (prefix < 19900 || prefix > 19919) {
        errors.zipCode = 'O CEP deve pertencer a Ourinhos - SP';
      }
    }
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getEffectiveAddress = () => {
    if (deliveryMethod === 'PICKUP') return null;
    if (deliverToDifferentAddress) {
      return {
        street: customAddress.street.trim(),
        number: customAddress.number.trim(),
        complement: customAddress.complement.trim() || null,
        neighborhood: customAddress.neighborhood.trim(),
        city: 'Ourinhos',
        state: 'SP',
        zipCode: customAddress.zipCode.trim(),
      };
    }
    return {
      street: userStreet,
      number: userNumber,
      complement: userComplement || null,
      neighborhood: userNeighborhood,
      city: userCity || 'Ourinhos',
      state: userState || 'SP',
      zipCode: userZipCode,
    };
  };

  const handleNextFromReceive = () => {
    if (deliveryMethod === 'DELIVERY' && !validateAddress()) {
      toast.error('Preencha os dados obrigatórios do endereço de entrega em Ourinhos - SP.');
      return;
    }
    setStep('PAYMENT');
  };

  const handleNextFromPayment = () => {
    const isCash = paymentMethod.toLowerCase().includes('dinheiro');
    if (isCash && needsChange) {
      const cleanChange = changeFor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      const numChange = parseFloat(cleanChange);
      if (isNaN(numChange) || numChange < totalAmount) {
        toast.error(`O valor para troco deve ser maior ou igual ao total do pedido (R$ ${totalAmount.toFixed(2).replace('.', ',')}).`);
        return;
      }
    }
    setStep('REVIEW');
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const isCash = paymentMethod.toLowerCase().includes('dinheiro');
      let parsedChangeFor: number | null = null;

      if (isCash && needsChange) {
        const cleanChange = changeFor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
        parsedChangeFor = parseFloat(cleanChange);
      }

      const payload = {
        items: cartItems.map(it => ({
          productId: it.product.id,
          quantity: it.quantity,
        })),
        deliveryMethod,
        deliveryAddress: getEffectiveAddress(),
        paymentMethod,
        needsChange: isCash ? needsChange : false,
        changeFor: parsedChangeFor,
        notes: notes.trim() || null,
      };

      const res = await api.post('/orders', payload);
      setCreatedOrder(res.data);
      setStep('SUCCESS');
      toast.success('Pedido enviado com sucesso!');
      onSuccess(res.data);
    } catch (err: any) {
      console.error('Erro ao finalizar pedido:', err);
      const msg = err.response?.data?.error || 'Erro ao processar pedido. Tente novamente.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentAddress = getEffectiveAddress();
  const numChangeVal = parseFloat(changeFor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.') || '0');
  const changeToReturn = !isNaN(numChangeVal) && numChangeVal >= totalAmount ? numChangeVal - totalAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#1E1F20] w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">
              {step === 'RECEIVE' && '1. Recebimento do Pedido'}
              {step === 'PAYMENT' && '2. Forma de Pagamento'}
              {step === 'REVIEW' && '3. Revisão e Confirmação'}
              {step === 'SUCCESS' && 'Pedido Realizado!'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
              {step !== 'SUCCESS' ? `${sellerName} • Ourinhos - SP` : 'Acompanhe o andamento'}
            </p>
          </div>

          {!isSubmitting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#282A2C] flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ========================================================================= */}
          {/* STEP 1: RECEIVE (Entrega vs Retirada - MESMO TAMANHO VISUAL) */}
          {/* ========================================================================= */}
          {step === 'RECEIVE' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] uppercase tracking-wider block mb-2">
                  Como você deseja receber o pedido?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('DELIVERY')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                      deliveryMethod === 'DELIVERY'
                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Truck size={22} className={deliveryMethod === 'DELIVERY' ? 'text-orange-500' : 'text-neutral-400'} />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryMethod === 'DELIVERY' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                      }`}>
                        {deliveryMethod === 'DELIVERY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Entrega</p>
                      <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">Receba no seu endereço</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('PICKUP')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                      deliveryMethod === 'PICKUP'
                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Store size={22} className={deliveryMethod === 'PICKUP' ? 'text-orange-500' : 'text-neutral-400'} />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryMethod === 'PICKUP' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                      }`}>
                        {deliveryMethod === 'PICKUP' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Retirar na Loja</p>
                      <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">Busque no estabelecimento</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* EQUALIZED CONTAINER (Problema 4 - mesmo tamanho visual e estabilidade) */}
              <div className="min-h-[220px] p-4 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] flex flex-col justify-between transition-all">
                {deliveryMethod === 'DELIVERY' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] flex items-center gap-1.5">
                        <MapPin size={14} className="text-orange-500" />
                        Endereço de Entrega
                      </h3>
                      <span className="text-[10px] text-neutral-400">Ourinhos - SP</span>
                    </div>

                    {!deliverToDifferentAddress ? (
                      <div className="space-y-3">
                        {hasRegisteredAddress ? (
                          <div className="p-3.5 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335] shadow-xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3]">
                                  {userStreet}, {userNumber}
                                  {userComplement ? ` (${userComplement})` : ''}
                                </p>
                                <p className="text-[11px] text-neutral-600 dark:text-[#C4C7C5] mt-0.5">
                                  {userNeighborhood} • Ourinhos - SP
                                </p>
                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                  CEP: {userZipCode}
                                </p>
                              </div>
                              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                                Cadastrado
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                            Nenhum endereço completo encontrado no perfil. Marque abaixo para informar o endereço de entrega.
                          </div>
                        )}

                        <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-[#C4C7C5] cursor-pointer select-none pt-1">
                          <input
                            type="checkbox"
                            checked={deliverToDifferentAddress}
                            onChange={(e) => setDeliverToDifferentAddress(e.target.checked)}
                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-neutral-300 cursor-pointer"
                          />
                          <span>Entregar em outro endereço</span>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={deliverToDifferentAddress}
                              onChange={(e) => setDeliverToDifferentAddress(e.target.checked)}
                              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-neutral-300 cursor-pointer"
                            />
                            <span>Entregar em outro endereço</span>
                          </label>
                          {hasRegisteredAddress && (
                            <button
                              type="button"
                              onClick={() => setDeliverToDifferentAddress(false)}
                              className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline cursor-pointer"
                            >
                              Usar endereço padrão
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <input
                              type="text"
                              value={customAddress.zipCode}
                              onChange={(e) => handleCepLookup(e.target.value)}
                              placeholder="CEP (19900-000)"
                              maxLength={9}
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            {addressErrors.zipCode && <p className="text-[9px] text-red-500">{addressErrors.zipCode}</p>}
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={customAddress.street}
                              onChange={(e) => setCustomAddress({ ...customAddress, street: e.target.value })}
                              placeholder="Rua / Avenida *"
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            {addressErrors.street && <p className="text-[9px] text-red-500">{addressErrors.street}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <input
                              type="text"
                              value={customAddress.number}
                              onChange={(e) => setCustomAddress({ ...customAddress, number: e.target.value })}
                              placeholder="Nº *"
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            {addressErrors.number && <p className="text-[9px] text-red-500">{addressErrors.number}</p>}
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={customAddress.complement}
                              onChange={(e) => setCustomAddress({ ...customAddress, complement: e.target.value })}
                              placeholder="Complemento (Apto, bloco)"
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              value={customAddress.neighborhood}
                              onChange={(e) => setCustomAddress({ ...customAddress, neighborhood: e.target.value })}
                              placeholder="Bairro *"
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            {addressErrors.neighborhood && <p className="text-[9px] text-red-500">{addressErrors.neighborhood}</p>}
                          </div>
                          <div>
                            <input
                              type="text"
                              value="Ourinhos - SP"
                              disabled
                              className="w-full text-xs px-2.5 py-1.5 bg-neutral-100 dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-500 cursor-not-allowed font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                      <Store size={16} className="text-amber-600 dark:text-amber-400" />
                      Você irá retirar este pedido no estabelecimento
                    </div>
                    <div className="p-3.5 bg-white dark:bg-[#1E1F20] rounded-xl border border-amber-200/80 dark:border-amber-800/40 text-xs space-y-1.5 shadow-xs">
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{sellerName}</p>
                      <p className="text-neutral-600 dark:text-[#C4C7C5] flex items-center gap-1.5">
                        <MapPin size={13} className="text-orange-500 shrink-0" />
                        {estabAddress}
                      </p>
                      {estabPhone && (
                        <p className="text-neutral-600 dark:text-[#C4C7C5] flex items-center gap-1.5">
                          <Phone size={13} className="text-neutral-400 shrink-0" />
                          {estabPhone}
                        </p>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-[#8E918F] leading-relaxed">
                      Após a confirmação, o estabelecimento parceiro separará seus produtos para que você retire diretamente no balcão da loja.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PAYMENT (Presencial com Ilustrações e Troco Reativo) */}
          {/* ========================================================================= */}
          {step === 'PAYMENT' && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40 flex items-start gap-3 text-xs text-blue-950 dark:text-blue-200">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Pagamento Presencial no Ato da Entrega ou Retirada</p>
                  <p className="text-[11px] leading-relaxed text-blue-900/80 dark:text-blue-300/80">
                    O pagamento será realizado no momento da entrega ou retirada. Para entrega por motoboy, ele levará a maquininha quando aplicável. Nenhum dado sensível de cartão é solicitado online.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] uppercase tracking-wider block mb-2">
                  Escolha a forma de pagamento:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'Cartão de Débito', label: 'Cartão de Débito', graphic: <DebitCardGraphic />, desc: 'Maquininha no local' },
                    { id: 'Cartão de Crédito', label: 'Cartão de Crédito', graphic: <CreditCardGraphic />, desc: 'Maquininha no local' },
                    { id: 'Pix', label: 'Pix', graphic: <PixGraphic />, desc: 'Chave na entrega/balcão' },
                    { id: 'Dinheiro', label: 'Dinheiro', graphic: <CashGraphic />, desc: 'Pagamento em espécie' },
                  ].map((p) => {
                    const isSelected = paymentMethod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                            : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {p.graphic}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-neutral-900 dark:text-[#E3E3E3]">{p.label}</p>
                          <p className="text-[10px] text-neutral-400 dark:text-[#8E918F]">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Change Section (Problema 5) */}
              {paymentMethod === 'Dinheiro' ? (
                <div className="p-4 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-3">
                  {/* Order Total Prominently Displayed */}
                  <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335] flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5]">Total a pagar:</span>
                    <span className="text-base font-black text-neutral-900 dark:text-[#E3E3E3]">
                      R$ {totalAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3]">Precisa de troco?</span>
                    <div className="flex gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setNeedsChange(false)}
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
                        onClick={() => setNeedsChange(true)}
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
                          onChange={(e) => setChangeFor(e.target.value)}
                          placeholder="Ex: 100,00"
                          className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      {/* Quick amount suggestion chips */}
                      <div className="flex gap-1.5 pt-0.5 flex-wrap">
                        {[20, 50, 100, 150, 200].filter(v => v > totalAmount).map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setChangeFor(val.toFixed(2).replace('.', ','))}
                            className="text-[10px] px-2.5 py-1 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-lg text-neutral-600 dark:text-[#C4C7C5] hover:border-orange-400 cursor-pointer font-medium"
                          >
                            R$ {val},00
                          </button>
                        ))}
                      </div>

                      {/* Validation and Dynamic Calculation */}
                      {changeFor && (
                        <div>
                          {numChangeVal < totalAmount ? (
                            <p className="text-[11px] text-red-500 font-semibold">
                              O valor informado deve ser maior ou igual ao total do pedido (R$ {totalAmount.toFixed(2).replace('.', ',')}).
                            </p>
                          ) : (
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between">
                              <span>Troco a devolver:</span>
                              <span className="font-bold text-xs">R$ {changeToReturn.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] text-[11px] text-neutral-500 dark:text-[#8E918F]">
                  <p>
                    ✓ Pagamento selecionado: <strong>{paymentMethod}</strong>. O atendente ou motoboy fará a cobrança presencialmente na conclusão da entrega ou retirada.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: REVIEW */}
          {/* ========================================================================= */}
          {step === 'REVIEW' && (
            <div className="space-y-4 text-xs">
              {/* Items summary */}
              <div className="p-4 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/50 dark:border-[#313335]">
                  <span className="font-bold text-neutral-700 dark:text-[#E3E3E3]">Produtos ({cartItems.length})</span>
                  <span className="text-neutral-500 dark:text-[#8E918F]">{sellerName}</span>
                </div>
                {cartItems.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-neutral-800 dark:text-[#C4C7C5]">
                      {it.quantity}x {it.product.name}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      R$ {(it.product.price * it.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Delivery & Payment details */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Recebimento</p>
                  <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">
                    {deliveryMethod === 'DELIVERY' ? '🚚 Entrega' : '🏪 Retirada na Loja'}
                  </p>
                  <p className="text-[11px] text-neutral-600 dark:text-[#C4C7C5] line-clamp-2">
                    {deliveryMethod === 'DELIVERY'
                      ? `${currentAddress?.street}, ${currentAddress?.number} - ${currentAddress?.neighborhood}`
                      : estabAddress}
                  </p>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Pagamento</p>
                  <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{paymentMethod}</p>
                  {paymentMethod === 'Dinheiro' && needsChange && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Troco para R$ {changeFor}
                    </p>
                  )}
                  <p className="text-[10px] text-neutral-400">Presencial</p>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-[11px] font-bold text-neutral-600 dark:text-[#C4C7C5] block mb-1">
                  Observações para o estabelecimento (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Interfone 42, deixar na portaria, etc."
                  className="w-full text-xs px-3 py-2 bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Total amount highlight */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-950 dark:text-orange-200">Total a pagar</p>
                  <p className="text-[10px] text-orange-700 dark:text-orange-400">Pagamento direto ao parceiro</p>
                </div>
                <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                  R$ {totalAmount.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: SUCCESS */}
          {/* ========================================================================= */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={36} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Pedido Enviado com Sucesso!</h3>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-1 max-w-sm mx-auto leading-relaxed">
                  O estabelecimento <strong>{sellerName}</strong> já recebeu sua solicitação e iniciará o atendimento.
                </p>
              </div>

              {createdOrder && (
                <div className="p-4 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335] max-w-xs mx-auto text-xs space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Identificador do Pedido</span>
                  <p className="font-mono font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">
                    #{createdOrder.id?.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-[#1E1F20] flex items-center justify-between">
          {step !== 'SUCCESS' ? (
            <>
              {step === 'RECEIVE' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(step === 'REVIEW' ? 'PAYMENT' : 'RECEIVE')}
                  className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              )}

              {step === 'RECEIVE' && (
                <Button onClick={handleNextFromReceive} rightIcon={<ChevronRight size={16} />} size="sm">
                  Continuar para Pagamento
                </Button>
              )}

              {step === 'PAYMENT' && (
                <Button onClick={handleNextFromPayment} rightIcon={<ChevronRight size={16} />} size="sm">
                  Revisar Pedido
                </Button>
              )}

              {step === 'REVIEW' && (
                <Button
                  onClick={handleConfirmOrder}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSubmitting ? 'Enviando pedido...' : 'Confirmar Pedido'}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => {
                onClose();
                window.location.href = '/tutor/compras';
              }}
              fullWidth
              size="md"
            >
              Ver Minhas Compras
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
