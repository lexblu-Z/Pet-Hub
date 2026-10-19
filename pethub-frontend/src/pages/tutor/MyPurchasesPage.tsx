import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowLeft, CheckCircle, Package, Clock, XCircle, 
  Store, Truck, MapPin, DollarSign, AlertTriangle, X, Ban, Star, Flag, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { Button, Badge } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { ItemLogo } from '@/components/shared/ServiceLogo';
import { ReportModal } from '@/components/shared/ReportModal';
import { ReviewModal } from '@/components/shared/ReviewModal';
import { ProductImage } from '@/components/shared/ProductImage';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  priceAtTime: number;
  product?: {
    id: string;
    name: string;
    photo?: string;
  };
  establishment?: {
    id: string;
    name: string;
    establishmentProfile?: {
      businessName?: string;
    };
  };
}

interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  deliveryMethod?: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: DeliveryAddress | null;
  paymentMethod?: string | null;
  needsChange?: boolean | null;
  changeFor?: number | null;
  notes?: string | null;
  totalAmount: number;
  createdAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationNotes?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
  refundedAt?: string | null;
  refundMethod?: string | null;
  refundReason?: string | null;
  review?: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  } | null;
  items: OrderItem[];
}

const TUTOR_CANCELLATION_REASONS = [
  'Desisti da compra',
  'Comprei por engano',
  'Endereço de entrega incorreto',
  'Demora na confirmação',
  'Forma de pagamento incorreta',
  'Outro',
];

export default function MyPurchasesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const targetOrderId = React.useMemo(() => {
    return searchParams.get('orderId') || (location.state as any)?.orderId || null;
  }, [searchParams, location.state]);
  const handledOrderIdRef = React.useRef<string | null>(null);

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    if (searchParams.has('orderId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
    }
  };
  
  // Tutor cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelNotes, setCancelNotes] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState<string | null>(null);

  // Review and Report modal states
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [reportModalOrder, setReportModalOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-open target order from notification
  useEffect(() => {
    if (!targetOrderId || handledOrderIdRef.current === targetOrderId) return;
    if (orders.length === 0) return;

    const ord = orders.find((o) => o.id === targetOrderId);
    if (ord) {
      handledOrderIdRef.current = targetOrderId;
      setSelectedOrder(ord);
    }
  }, [targetOrderId, orders]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      toast.error('Erro ao carregar histórico de compras.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceipt = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsConfirmingReceipt(orderId);
    try {
      await api.post(`/orders/${orderId}/confirm-receipt`);
      toast.success('Recebimento confirmado!', 'Obrigado por comprar conosco.');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED' } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao confirmar recebimento.');
    } finally {
      setIsConfirmingReceipt(null);
    }
  };

  const handleConfirmTutorCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (!cancelReason) {
      toast.error('Selecione o motivo do cancelamento.');
      return;
    }
    if (cancelReason === 'Outro' && !cancelNotes.trim()) {
      toast.error('Descreva o motivo do cancelamento.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await api.post(`/orders/${cancelModalOrder.id}/cancel`, {
        reason: cancelReason,
        notes: cancelNotes.trim() || undefined,
      });

      const refundInfo = res.data.refund;
      const refundMsg = refundInfo?.amount ? ` Reembolso simulado de R$ ${refundInfo.amount.toFixed(2).replace('.', ',')} registrado.` : '';
      toast.success(`Pedido cancelado com sucesso.${refundMsg}`);

      const updatedCancelledOrder: Order = {
        ...cancelModalOrder,
        status: 'CANCELLED',
        cancelledAt: res.data.order?.cancelledAt || new Date().toISOString(),
        cancelledBy: 'TUTOR',
        cancellationReason: cancelReason,
        cancellationNotes: cancelNotes.trim() || null,
        refundStatus: refundInfo?.status || 'REFUNDED',
        refundAmount: refundInfo?.amount || cancelModalOrder.totalAmount,
        refundedAt: refundInfo?.refundedAt || new Date().toISOString(),
        refundMethod: refundInfo?.method || 'SIMULATED_REVERSAL',
      };

      setOrders(prev => prev.map(o => o.id === cancelModalOrder.id ? updatedCancelledOrder : o));
      if (selectedOrder?.id === cancelModalOrder.id) {
        setSelectedOrder(updatedCancelledOrder);
      }

      setCancelModalOrder(null);
      setCancelReason('');
      setCancelNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar o pedido.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'PENDING': 
        return { label: 'Aguardando Confirmação', icon: <Clock size={14} />, color: 'warning' };
      case 'PAID':
      case 'CONFIRMED': 
        return { label: 'Confirmado pela Loja', icon: <CheckCircle size={14} />, color: 'info' };
      case 'PREPARING':
        return { label: 'Em Preparo', icon: <Package size={14} />, color: 'info' };
      case 'SHIPPED': 
        return { label: 'A Caminho / Em Rota', icon: <Truck size={14} />, color: 'brand' };
      case 'READY_FOR_PICKUP':
        return { label: 'Pronto para Retirada no Balcão', icon: <Store size={14} />, color: 'brand' };
      case 'DELIVERED': 
        return { label: 'Entregue (Aguardando sua confirmação)', icon: <CheckCircle size={14} />, color: 'warning' };
      case 'COMPLETED': 
        return { label: 'Concluído', icon: <CheckCircle size={14} />, color: 'success' };
      case 'CANCELLED': 
        return { label: 'Cancelado', icon: <XCircle size={14} />, color: 'error' };
      default: 
        return { label: status, icon: null, color: 'info' };
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-neutral-500">Carregando histórico...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-full transition-colors text-neutral-800 dark:text-[#E3E3E3] cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Minhas Compras</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-100 dark:border-[#313335] p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Você ainda não fez nenhuma compra</h2>
          <p className="text-neutral-500 dark:text-[#8E918F] mb-6 max-w-sm">
            Encontre produtos reais para o seu pet nas lojas parceiras do PetHub.
          </p>
          <Button onClick={() => navigate('/tutor/shop')} size="lg" leftIcon={<ShoppingBag size={18} />}>
            Explorar produtos
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            const isDelivery = order.deliveryMethod !== 'PICKUP';
            const canConfirmReceipt = ['SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED'].includes(order.status);
            const canCancel = ['PENDING', 'CONFIRMED', 'PAID'].includes(order.status);

            return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusInfo.color as any} className="flex items-center gap-1.5 px-2 py-1">
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-neutral-500 dark:text-[#8E918F]">
                      #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[10px] bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
                      {isDelivery ? <><Truck size={11} /> Entrega</> : <><Store size={11} /> Retirada no Balcão</>}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </p>
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm sm:text-base">
                      R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-2">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-[#282A2C] overflow-hidden shrink-0 border border-neutral-200/50 dark:border-[#313335]">
                        <ProductImage
                          product={item.product}
                          src={item.product?.photo || item.photo}
                          alt={item.productName || item.product?.name}
                          iconSize={16}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-xs truncate">{item.productName || item.product?.name || 'Produto'}</h3>
                        <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                          {item.quantity}x R$ {item.priceAtTime.toFixed(2).replace('.', ',')} • {item.establishment?.establishmentProfile?.businessName || item.establishment?.name || 'Loja Parceira'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cancelled Banner if applicable */}
                {order.status === 'CANCELLED' && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-500" />
                      Pedido cancelado {order.cancelledBy === 'ESTABLISHMENT' ? 'pela loja' : 'por você'}
                    </p>
                    {order.cancellationReason && <p><span className="font-semibold">Motivo:</span> {order.cancellationReason}</p>}
                    <div className="flex items-center gap-1.5 pt-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <RotateCcw size={13} />
                      <span>
                        Estorno simulado: R$ {(order.refundAmount || order.totalAmount).toFixed(2).replace('.', ',')}
                        {order.refundStatus === 'REFUNDED' ? ' (Reembolsado)' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Tutor */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                  {/* Contextual Report Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportModalOrder(order);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                    title="Denunciar este estabelecimento"
                  >
                    <Flag size={13} />
                    <span className="hidden sm:inline">Denunciar</span>
                  </button>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelModalOrder(order);
                        setCancelReason('');
                        setCancelNotes('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                    >
                      Cancelar Pedido
                    </button>
                  )}

                  {canConfirmReceipt && (
                    <Button
                      size="sm"
                      disabled={isConfirmingReceipt === order.id}
                      onClick={(e) => handleConfirmReceipt(order.id, e)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      leftIcon={<CheckCircle size={14} />}
                    >
                      {isConfirmingReceipt === order.id ? 'Confirmando...' : 'Confirmar Recebimento'}
                    </Button>
                  )}

                  {/* Review Button / Rating Badge */}
                  {['DELIVERED', 'COMPLETED'].includes(order.status) && (
                    order.review ? (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 rounded-xl">
                        <Star size={13} className="fill-amber-500 text-amber-500" />
                        <span>Avaliado ({order.review.rating}★)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewModalOrder(order);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Star size={13} className="fill-amber-500 text-amber-500" />
                        Avaliar Loja
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detalhes Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Detalhes da Compra</h2>
                  <p className="text-neutral-500 dark:text-[#8E918F] text-xs font-mono">
                    Pedido #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <button onClick={handleCloseOrderModal} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-full cursor-pointer text-neutral-400 dark:text-[#8E918F]">
                  <X size={20} />
                </button>
              </div>

              {/* Status and Date */}
              <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] rounded-2xl p-4 flex justify-between items-center text-xs">
                <div>
                  <p className="text-neutral-500 dark:text-[#8E918F] mb-1">Data da compra</p>
                  <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {new Date(selectedOrder.createdAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-[#8E918F] mb-1">Status</p>
                  <Badge variant={getStatusInfo(selectedOrder.status).color as any} className="flex items-center gap-1.5 px-2 py-1">
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </div>
              </div>

              {/* Cancelled Banner if applicable */}
              {selectedOrder.status === 'CANCELLED' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <XCircle size={14} className="text-rose-500" />
                    Pedido cancelado {selectedOrder.cancelledBy === 'ESTABLISHMENT' ? 'pelo estabelecimento parceiro' : 'por você'}
                  </p>
                  {selectedOrder.cancellationReason && (
                    <p><span className="font-semibold">Motivo:</span> {selectedOrder.cancellationReason}</p>
                  )}
                  {selectedOrder.cancellationNotes && (
                    <p><span className="font-semibold">Detalhes:</span> {selectedOrder.cancellationNotes}</p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1 text-emerald-700 dark:text-emerald-400 font-semibold border-t border-rose-200 dark:border-rose-900/40">
                    <RotateCcw size={13} />
                    <span>
                      Estorno simulado: R$ {(selectedOrder.refundAmount || selectedOrder.totalAmount).toFixed(2).replace('.', ',')}
                      {selectedOrder.refundStatus === 'REFUNDED' ? ' (Registrado no financeiro)' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery / Pickup Box */}
              <div className="bg-neutral-50 dark:bg-[#282A2C] rounded-2xl p-3.5 border border-neutral-100 dark:border-[#313335] text-xs space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-neutral-500 dark:text-[#8E918F] uppercase text-[10px] tracking-wider">
                    Forma de Recebimento
                  </span>
                  <Badge variant="brand">
                    {selectedOrder.deliveryMethod === 'PICKUP' ? 'Retirada no Balcão' : 'Entrega em Domicílio'}
                  </Badge>
                </div>
                {selectedOrder.deliveryMethod === 'DELIVERY' && selectedOrder.deliveryAddress ? (
                  <p className="text-neutral-700 dark:text-[#C4C7C5] flex items-start gap-1.5">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-neutral-400" />
                    <span>
                      {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.number}
                      {selectedOrder.deliveryAddress.complement ? ` (${selectedOrder.deliveryAddress.complement})` : ''} - {selectedOrder.deliveryAddress.neighborhood}, {selectedOrder.deliveryAddress.city} - {selectedOrder.deliveryAddress.state}
                    </span>
                  </p>
                ) : (
                  <p className="text-neutral-700 dark:text-[#C4C7C5] flex items-start gap-1.5">
                    <Store size={14} className="shrink-0 mt-0.5 text-neutral-400" />
                    <span>Retirada no balcão da loja parceira. Apresente o código do pedido ao atendente.</span>
                  </p>
                )}
              </div>

              {/* Products List */}
              <div className="space-y-3">
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm border-b border-neutral-100 dark:border-[#313335] pb-1.5">
                  Produtos ({selectedOrder.items.length})
                </h3>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-[#282A2C] overflow-hidden shrink-0 border border-neutral-200/50 dark:border-[#313335]">
                        <ProductImage
                          product={item.product}
                          src={item.product?.photo || item.photo}
                          alt={item.productName || item.product?.name}
                          iconSize={18}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <ItemLogo size="xs" />
                          <h4 className="font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{item.productName || item.product?.name || 'Produto'}</h4>
                        </div>
                        <p className="text-neutral-500 dark:text-[#8E918F]">{item.quantity}x R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] shrink-0">
                      R$ {(item.quantity * item.priceAtTime).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment & Total */}
              <div className="border-t border-neutral-100 dark:border-[#313335] pt-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-neutral-500 dark:text-[#8E918F]">
                  <span>Forma de pagamento</span>
                  <span className="font-semibold text-neutral-800 dark:text-[#E3E3E3] inline-flex items-center gap-1.5">
                    <PaymentLogo method={selectedOrder.paymentMethod} size="xs" />
                    <span>
                      {selectedOrder.paymentMethod || 'Presencial'}
                      {selectedOrder.needsChange && selectedOrder.changeFor ? ` (Troco p/ R$ ${selectedOrder.changeFor.toFixed(2).replace('.', ',')})` : ''}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-bold text-neutral-900 dark:text-[#E3E3E3] pt-1">
                  <span>Total</span>
                  <span className="text-orange-600 dark:text-orange-400">
                    R$ {selectedOrder.totalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOrder(selectedOrder)}
                  className="px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Flag size={14} />
                  <span>Denunciar Loja</span>
                </button>

                <div className="flex items-center gap-2">
                  {['PENDING', 'CONFIRMED', 'PAID'].includes(selectedOrder.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModalOrder(selectedOrder);
                        setCancelReason('');
                        setCancelNotes('');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                    >
                      Cancelar Pedido
                    </button>
                  )}

                  {['SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED'].includes(selectedOrder.status) && (
                    <Button
                      disabled={isConfirmingReceipt === selectedOrder.id}
                      onClick={() => handleConfirmReceipt(selectedOrder.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      leftIcon={<CheckCircle size={16} />}
                    >
                      {isConfirmingReceipt === selectedOrder.id ? 'Confirmando...' : 'Confirmar Recebimento'}
                    </Button>
                  )}

                  {['DELIVERED', 'COMPLETED'].includes(selectedOrder.status) && (
                    selectedOrder.review ? (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-2 rounded-xl">
                        <Star size={13} className="fill-amber-500 text-amber-500" />
                        <span>Avaliado ({selectedOrder.review.rating}★)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewModalOrder(selectedOrder)}
                        className="px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Star size={13} className="fill-amber-500 text-amber-500" />
                        Avaliar Loja
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tutor Cancellation Modal */}
      <AnimatePresence>
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingCancel && setCancelModalOrder(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-3xl shadow-2xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#313335]">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
                  <AlertTriangle size={18} />
                  <span>Cancelar Pedido #{cancelModalOrder.orderNumber || cancelModalOrder.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmittingCancel && setCancelModalOrder(null)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold">Tem certeza que deseja cancelar?</p>
                <p>O pedido será cancelado imediatamente e os itens retornarão ao estoque do parceiro.</p>
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  O valor de R$ {cancelModalOrder.totalAmount.toFixed(2).replace('.', ',')} terá o estorno/reembolso demonstrativo registrado e saldo/cupons restituídos.
                </p>
              </div>

              <form onSubmit={handleConfirmTutorCancellation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1.5">
                    Motivo do cancelamento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    className="w-full text-xs font-medium bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">Selecione um motivo...</option>
                    {TUTOR_CANCELLATION_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1.5">
                    Observações adicionais {cancelReason === 'Outro' && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    required={cancelReason === 'Outro'}
                    placeholder={cancelReason === 'Outro' ? 'Descreva detalhadamente o motivo...' : 'Informações para registrar no cancelamento (opcional)...'}
                    className="w-full text-xs bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl p-3 text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmittingCancel}
                    onClick={() => setCancelModalOrder(null)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingCancel || !cancelReason}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    {isSubmittingCancel ? 'Cancelando...' : 'Confirmar Cancelamento'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      {reviewModalOrder && (
        <ReviewModal
          isOpen={!!reviewModalOrder}
          onClose={() => setReviewModalOrder(null)}
          orderId={reviewModalOrder.id}
          targetName={
            reviewModalOrder.items[0]?.establishment?.establishmentProfile?.businessName ||
            reviewModalOrder.items[0]?.establishment?.name ||
            'Loja Parceira'
          }
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Report Modal */}
      {reportModalOrder && (
        <ReportModal
          isOpen={!!reportModalOrder}
          onClose={() => setReportModalOrder(null)}
          targetType="ESTABLISHMENT"
          reportedEstablishmentId={
            reportModalOrder.items[0]?.establishment?.id
          }
          targetName={
            reportModalOrder.items[0]?.establishment?.establishmentProfile?.businessName ||
            reportModalOrder.items[0]?.establishment?.name ||
            'Estabelecimento Parceiro'
          }
          contextType="ORDER"
          contextId={reportModalOrder.orderNumber || reportModalOrder.id}
        />
      )}
    </div>
  );
}
