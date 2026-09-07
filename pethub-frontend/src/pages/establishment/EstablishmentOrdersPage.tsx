import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { 
  ClipboardList, Package, User, Calendar, DollarSign, Search, 
  CheckCircle, Clock, Truck, XCircle, Store, Copy, Check, Phone, 
  MapPin, AlertTriangle, MessageSquare, RefreshCw, X, Ban,
  ChevronRight, ChevronDown, ChevronsUpDown, CheckCircle2
} from 'lucide-react';
import { Input, Button, Badge, Avatar } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { WhatsAppIcon } from '@/components/shared/WhatsAppIcon';

interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  photo: string | null;
  quantity: number;
  priceAtTime: number;
  subtotal: number;
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

interface OrderData {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string | null;
  deliveryMethod?: 'DELIVERY' | 'PICKUP' | null;
  deliveryAddress?: DeliveryAddress | null;
  needsChange?: boolean | null;
  changeFor?: number | null;
  notes?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationNotes?: string | null;
  createdAt: string;
  tutor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
  items: OrderItemDetail[];
  totalAmount: number;
}

const statusLabels: Record<string, { label: string; badge: 'warning' | 'info' | 'brand' | 'success' | 'error'; icon: any }> = {
  PENDING: { label: 'Pendente', badge: 'warning', icon: Clock },
  PAID: { label: 'Confirmado', badge: 'info', icon: CheckCircle },
  CONFIRMED: { label: 'Confirmado', badge: 'info', icon: CheckCircle },
  PREPARING: { label: 'Em Preparo', badge: 'info', icon: Package },
  SHIPPED: { label: 'A Caminho', badge: 'brand', icon: Truck },
  READY_FOR_PICKUP: { label: 'Pronto p/ Retirada', badge: 'brand', icon: Store },
  DELIVERED: { label: 'Entregue', badge: 'success', icon: CheckCircle },
  COMPLETED: { label: 'Concluído', badge: 'success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', badge: 'error', icon: XCircle },
};

const CANCELLATION_REASONS = [
  'Produto sem estoque',
  'Quantidade insuficiente de itens',
  'Produto avariado / indisponível',
  'Erro no preço ou cadastro do produto',
  'Problema operacional / Estabelecimento fechado',
  'Impossibilidade de entrega no endereço',
  'Horário de entrega indisponível',
  'Pedido duplicado',
  'Outro',
];

export default function EstablishmentOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Accordion Expand/Collapse State
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderData | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelNotes, setCancelNotes] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const toast = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/establishment/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedOrderIds(new Set(filtered.map((o) => o.id)));
  };

  const handleCollapseAll = () => {
    setExpandedOrderIds(new Set());
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'COMPLETED') {
      toast.error('Apenas o tutor/cliente pode confirmar o recebimento do pedido.');
      return;
    }
    if (newStatus === 'CANCELLED') {
      const orderToCancel = orders.find((o) => o.id === orderId);
      if (orderToCancel) {
        setCancelModalOrder(orderToCancel);
        setCancelReason('');
        setCancelNotes('');
      }
      return;
    }

    setUpdatingId(orderId);
    try {
      await api.put(`/establishment/orders/${orderId}/status`, { status: newStatus });
      toast.success('Status do pedido atualizado!');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar pedido.');
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
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
      const res = await api.post(`/establishment/orders/${cancelModalOrder.id}/cancel`, {
        reason: cancelReason,
        notes: cancelNotes.trim() || undefined,
      });

      toast.success('Pedido cancelado com sucesso. Estoque dos produtos restabelecido.');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelModalOrder.id
            ? {
                ...o,
                status: 'CANCELLED',
                cancelledAt: res.data.order?.cancelledAt || new Date().toISOString(),
                cancelledBy: 'ESTABLISHMENT',
                cancellationReason: cancelReason,
                cancellationNotes: cancelNotes.trim() || null,
              }
            : o
        )
      );

      setCancelModalOrder(null);
      setCancelReason('');
      setCancelNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar o pedido.');
      setCancelModalOrder(null);
      setCancelReason('');
      setCancelNotes('');
      fetchOrders();
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const copyMotoboyDetails = (order: OrderData) => {
    const isDelivery = order.deliveryMethod !== 'PICKUP';
    const addressStr = order.deliveryAddress
      ? `${order.deliveryAddress.street}, ${order.deliveryAddress.number}${
          order.deliveryAddress.complement ? ` (${order.deliveryAddress.complement})` : ''
        } - ${order.deliveryAddress.neighborhood}, ${order.deliveryAddress.city} - ${
          order.deliveryAddress.state
        } (CEP: ${order.deliveryAddress.zipCode})`
      : 'Retirada no balcão da loja';

    const itemsStr = order.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.productName} (R$ ${it.subtotal.toFixed(2).replace('.', ',')})`
      )
      .join('\n');

    let changeInfo = '';
    if (
      order.paymentMethod?.toLowerCase().includes('dinheiro') &&
      order.needsChange &&
      order.changeFor
    ) {
      const changeAmount = order.changeFor - order.totalAmount;
      changeInfo = `\n- Troco para: R$ ${order.changeFor
        .toFixed(2)
        .replace('.', ',')} (Devolver ao cliente: R$ ${changeAmount
        .toFixed(2)
        .replace('.', ',')})`;
    }

    const text = `PEDIDO #${order.orderNumber}
Cliente: ${order.tutor.name}
Contato: ${order.tutor.phone || 'Não informado'}
Tipo: ${isDelivery ? 'Entrega em domicílio' : 'Retirada na loja'}
${isDelivery ? `Endereço: ${addressStr}` : ''}
Forma de Pagamento: ${order.paymentMethod || 'A combinar'}${changeInfo}
${order.notes ? `Observações: ${order.notes}` : ''}

ITENS:
${itemsStr}

TOTAL: R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    toast.success('Dados para motoboy copiados!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Format short Brazilian date & time: "06/09 • 15:10"
  const formatDateTimeShort = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    return `${day} • ${time}`;
  };

  // Filter & Search
  const filtered = orders
    .filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.tutor.name.toLowerCase().includes(q) ||
        o.tutor.email.toLowerCase().includes(q) ||
        (o.tutor.phone && o.tutor.phone.includes(q)) ||
        (o.deliveryAddress?.street && o.deliveryAddress.street.toLowerCase().includes(q)) ||
        (o.deliveryAddress?.neighborhood && o.deliveryAddress.neighborhood.toLowerCase().includes(q)) ||
        o.items.some((it) => it.productName.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Dynamic filter counters
  const countPending = orders.filter((o) => o.status === 'PENDING').length;
  const countConfirmed = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PAID').length;
  const countPreparing = orders.filter((o) => o.status === 'PREPARING').length;
  const countShipped = orders.filter((o) => o.status === 'SHIPPED').length;
  const countPickup = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const countDelivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const countCompleted = orders.filter((o) => o.status === 'COMPLETED').length;
  const countCancelled = orders.filter((o) => o.status === 'CANCELLED').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
            Pedidos de Clientes
          </h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
            Acompanhe pedidos, prepare entregas e despache para motoboy ou balcão
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={fetchOrders}
            className="p-2 bg-neutral-100 dark:bg-[#282A2C] rounded-xl text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
            title="Recarregar pedidos"
          >
            <RefreshCw size={15} />
          </button>
          <span className="px-3 py-1.5 bg-neutral-100 dark:bg-[#282A2C] rounded-xl text-neutral-700 dark:text-[#C4C7C5] border border-neutral-200/50 dark:border-[#313335]">
            Total: {orders.length}
          </span>
          <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800/50">
            Pendentes: {countPending}
          </span>
          <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800/50">
            Em Preparo / Rota: {countPreparing + countShipped + countPickup}
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
            Concluídos: {countCompleted}
          </span>
        </div>
      </div>

      {/* Filters, Search & Bulk Actions Bar */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar por nº do pedido, cliente, telefone ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>

          {/* Quick Accordion Toggles */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100 dark:hover:bg-[#313335] border border-neutral-200/80 dark:border-[#313335] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Expandir todos os pedidos da lista"
              >
                <ChevronsUpDown size={13} className="text-neutral-400" />
                <span>Expandir todos</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-[#282A2C] hover:bg-neutral-100 dark:hover:bg-[#313335] border border-neutral-200/80 dark:border-[#313335] rounded-xl transition-colors cursor-pointer"
                title="Recolher todos os pedidos da lista"
              >
                Recolher todos
              </button>
            </div>
          )}
        </div>

        {/* Status Filter Pills with Real Counters */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-100 dark:border-[#313335]">
          {[
            { id: 'ALL', label: 'Todos', count: orders.length },
            { id: 'PENDING', label: 'Pendentes', count: countPending },
            { id: 'CONFIRMED', label: 'Confirmados', count: countConfirmed },
            { id: 'PREPARING', label: 'Em Preparo', count: countPreparing },
            { id: 'SHIPPED', label: 'A Caminho', count: countShipped },
            { id: 'READY_FOR_PICKUP', label: 'Para Retirada', count: countPickup },
            { id: 'DELIVERED', label: 'Entregues', count: countDelivered },
            { id: 'COMPLETED', label: 'Concluídos', count: countCompleted },
            { id: 'CANCELLED', label: 'Cancelados', count: countCancelled },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl transition-all text-xs font-medium cursor-pointer flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-neutral-900 dark:bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-200 dark:hover:bg-[#313335]'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  statusFilter === f.id
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F]">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando pedidos do banco...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335]">
          <ClipboardList size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">
            Nenhum pedido encontrado
          </h3>
          <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-md mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Tente alterar os termos de busca ou remover os filtros aplicados.'
              : 'Quando os tutores comprarem produtos do seu catálogo, os pedidos aparecerão organizados aqui.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((order) => {
            const statusConfig = statusLabels[order.status] || statusLabels.PENDING;
            const StatusIcon = statusConfig.icon;
            const isDelivery = order.deliveryMethod !== 'PICKUP';
            const isCash = order.paymentMethod?.toLowerCase().includes('dinheiro');
            const cleanPhone = order.tutor.phone?.replace(/\D/g, '') || '';
            const isFinished = order.status === 'COMPLETED' || order.status === 'CANCELLED';
            const isCancellable = !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status);
            const isExpanded = expandedOrderIds.has(order.id);

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-200 dark:bg-[#1E1F20] ${
                  isExpanded
                    ? 'border-orange-300/80 ring-1 ring-orange-500/20 dark:border-orange-500/40'
                    : 'border-neutral-200/80 hover:border-neutral-300 dark:border-[#313335] dark:hover:border-neutral-600'
                }`}
              >
                {/* COMPACT ROW (VISIBLE WHEN CLOSED OR OPEN) */}
                <button
                  type="button"
                  onClick={() => toggleExpand(order.id)}
                  className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Expand/Collapse Chevron */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-transform duration-200 dark:bg-[#282A2C] dark:text-neutral-400 ${
                        isExpanded ? 'rotate-90 text-orange-500 bg-orange-50 dark:bg-orange-950/40' : ''
                      }`}
                    >
                      <ChevronRight size={16} />
                    </div>

                    {/* Order Number */}
                    <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 dark:text-[#E3E3E3] shrink-0">
                      #{order.orderNumber}
                    </span>

                    {/* Customer Info */}
                    <div className="flex items-center gap-2 min-w-0">
                      {order.tutor.avatar ? (
                        <img
                          src={order.tutor.avatar}
                          alt={order.tutor.name}
                          className="h-7 w-7 rounded-full object-cover shrink-0 border border-neutral-200/80 dark:border-[#313335]"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200 shrink-0">
                          {order.tutor.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 truncate">
                        {order.tutor.name}
                      </span>
                    </div>

                    {/* Date & Time */}
                    <span className="hidden sm:inline-flex text-xs text-neutral-400 dark:text-[#8E918F] shrink-0 items-center gap-1">
                      <span>•</span>
                      {formatDateTimeShort(order.createdAt)}
                    </span>
                  </div>

                  {/* Right side: Amount preview and Status Badge */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="hidden md:inline-block font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                    </span>

                    <Badge variant={statusConfig.badge}>
                      <StatusIcon size={12} className="mr-1 inline" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </button>

                {/* EXPANDED DETAILS ACCORDION CONTENT */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-neutral-100 dark:border-[#313335]"
                    >
                      <div className="p-4 sm:p-5 space-y-4 bg-neutral-50/30 dark:bg-transparent">
                        {/* Cancellation Banner if Cancelled */}
                        {order.status === 'CANCELLED' && (
                          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <XCircle size={14} className="text-rose-500 shrink-0" />
                              Pedido Cancelado {order.cancelledBy === 'ESTABLISHMENT' ? 'pelo Estabelecimento' : order.cancelledBy === 'TUTOR' ? 'pelo Cliente/Tutor' : ''}
                              {order.cancelledAt && ` em ${new Date(order.cancelledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                            {order.cancellationReason && (
                              <p><span className="font-semibold">Motivo:</span> {order.cancellationReason}</p>
                            )}
                            {order.cancellationNotes && (
                              <p><span className="font-semibold">Detalhes:</span> {order.cancellationNotes}</p>
                            )}
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <CheckCircle2 size={12} className="shrink-0" />
                              <span>Os produtos deste pedido foram estornados automaticamente para o estoque do estabelecimento.</span>
                            </p>
                          </div>
                        )}

                        {/* 3 Operational Columns: Client, Receiving/Address, Payment & Change */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* Column 1: Client Info */}
                          <div className="p-3.5 bg-white dark:bg-[#282A2C] rounded-2xl border border-neutral-200/70 dark:border-[#313335] space-y-2 shadow-2xs">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                              Dados do Cliente
                            </span>
                            <div className="flex items-center gap-2.5">
                              <Avatar src={order.tutor.avatar || '/user.jpg'} name={order.tutor.name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-xs truncate">{order.tutor.name}</p>
                                <p className="text-[11px] text-neutral-500 dark:text-[#8E918F] truncate">{order.tutor.email}</p>
                                {order.tutor.phone ? (
                                  <a
                                    href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${order.tutor.name}, sobre seu pedido #${order.orderNumber} no PetHub:`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1 mt-0.5"
                                    title="Abrir conversa no WhatsApp"
                                  >
                                    <WhatsAppIcon size={14} />
                                    {order.tutor.phone} (WhatsApp)
                                  </a>
                                ) : (
                                  <p className="text-[11px] text-neutral-400">Sem telefone cadastrado</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Receiving & Address */}
                          <div className="p-3.5 bg-white dark:bg-[#282A2C] rounded-2xl border border-neutral-200/70 dark:border-[#313335] space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                                Recebimento
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                isDelivery 
                                  ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300' 
                                  : 'bg-neutral-200 dark:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5]'
                              }`}>
                                {isDelivery ? <><Truck size={11} /> Entrega em Domicílio</> : <><Store size={11} /> Retirada na Loja</>}
                              </span>
                            </div>

                            {isDelivery ? (
                              order.deliveryAddress ? (
                                <div className="text-xs text-neutral-800 dark:text-[#E3E3E3] space-y-0.5 leading-snug">
                                  <p className="font-semibold flex items-center gap-1">
                                    <MapPin size={12} className="text-orange-500 shrink-0" />
                                    {order.deliveryAddress.street}, {order.deliveryAddress.number}
                                    {order.deliveryAddress.complement ? ` (${order.deliveryAddress.complement})` : ''}
                                  </p>
                                  <p className="text-neutral-500 dark:text-[#8E918F] text-[11px] pl-4">
                                    {order.deliveryAddress.neighborhood} • {order.deliveryAddress.city} - {order.deliveryAddress.state}
                                  </p>
                                  <p className="text-neutral-400 text-[10px] pl-4">
                                    CEP: {order.deliveryAddress.zipCode}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-400">Endereço de entrega não detalhado.</p>
                              )
                            ) : (
                              <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] pt-1">
                                O tutor comparecerá ao balcão para retirar a compra.
                              </p>
                            )}
                          </div>

                          {/* Column 3: Payment & Change Info */}
                          <div className="p-3.5 bg-white dark:bg-[#282A2C] rounded-2xl border border-neutral-200/70 dark:border-[#313335] space-y-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                              Forma de Pagamento
                            </span>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-[#E3E3E3]">
                              <PaymentLogo method={order.paymentMethod} size="xs" />
                              <span>{order.paymentMethod || 'A combinar'}</span>
                            </div>

                            {isCash ? (
                              order.needsChange && order.changeFor ? (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300">
                                  <p className="font-bold flex items-center gap-1">
                                    <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" /> Precisa de troco:
                                  </p>
                                  <p>Troco para: R$ {order.changeFor.toFixed(2).replace('.', ',')}</p>
                                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                    Devolver ao cliente: R$ {(order.changeFor - order.totalAmount).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                                  Sem troco (pagará valor exato).
                                </p>
                              )
                            ) : (
                              <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                                {isDelivery 
                                  ? 'Entregador deve levar a maquininha de cartão / chave Pix.' 
                                  : 'Cobrar no balcão no ato da retirada.'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Customer Notes */}
                        {order.notes && (
                          <div className="p-3 bg-neutral-100/60 dark:bg-[#282A2C]/60 rounded-xl border border-neutral-200/50 dark:border-[#313335] text-xs flex items-start gap-2">
                            <MessageSquare size={14} className="text-orange-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-neutral-700 dark:text-[#E3E3E3]">Observações do cliente: </span>
                              <span className="text-neutral-600 dark:text-[#C4C7C5]">{order.notes}</span>
                            </div>
                          </div>
                        )}

                        {/* Products List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider block">
                            Produtos do Pedido ({order.items.length})
                          </span>
                          <div className="divide-y divide-neutral-100 dark:divide-[#313335] border border-neutral-200/70 dark:border-[#313335] rounded-xl overflow-hidden bg-white dark:bg-[#1E1F20]">
                            {order.items.map((it) => (
                              <div key={it.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-[#282A2C] flex items-center justify-center overflow-hidden shrink-0 border border-neutral-200/50 dark:border-[#313335]">
                                    {it.photo ? (
                                      <img src={it.photo} alt={it.productName} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={14} className="text-neutral-400 dark:text-[#8E918F]" />
                                    )}
                                  </div>
                                  <span className="font-medium text-neutral-800 dark:text-[#E3E3E3] truncate">{it.productName}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 text-neutral-600 dark:text-[#C4C7C5]">
                                  <span>{it.quantity}x R$ {it.priceAtTime.toFixed(2).replace('.', ',')}</span>
                                  <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] min-w-[70px] text-right">
                                    R$ {it.subtotal.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Motoboy Dispatch Block */}
                        <div className="p-3.5 bg-neutral-100/70 dark:bg-[#282A2C] rounded-2xl border border-neutral-200/70 dark:border-[#313335] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5 text-xs">
                            <span className="font-bold text-neutral-800 dark:text-[#E3E3E3] flex items-center gap-1.5">
                              <Truck size={14} className="text-orange-500" />
                              Despacho Operacional {isDelivery ? '(Motoboy / Entrega)' : '(Retirada no Balcão)'}
                            </span>
                            <p className="text-[11px] text-neutral-500 dark:text-[#8E918F]">
                              {isDelivery 
                                ? 'Copie o resumo formatado com dados de endereço, cliente, troco e itens para enviar ao entregador.' 
                                : 'Separe os itens para entrega imediata no balcão da loja.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyMotoboyDetails(order)}
                              className="px-3.5 py-2 bg-white dark:bg-[#1E1F20] hover:bg-neutral-100 dark:hover:bg-[#313335] text-neutral-800 dark:text-[#E3E3E3] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              {copiedId === order.id ? (
                                <>
                                  <Check size={14} className="text-emerald-500" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} className="text-orange-500" />
                                  <span>Copiar dados para Motoboy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Pipeline Step Actions, Cancellation, and Total */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/70 dark:border-[#313335]">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Cancellation Button */}
                            {isCancellable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModalOrder(order);
                                  setCancelReason('');
                                  setCancelNotes('');
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1 border border-rose-200 dark:border-rose-900/50 cursor-pointer mr-1"
                                title="Cancelar este pedido e devolver itens ao estoque"
                              >
                                <Ban size={12} />
                                Cancelar Pedido
                              </button>
                            )}

                            {order.status === 'PENDING' && (
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <CheckCircle size={13} />
                                Confirmar Pedido
                              </button>
                            )}

                            {(order.status === 'CONFIRMED' || order.status === 'PAID') && (
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Package size={13} />
                                Iniciar Preparo
                              </button>
                            )}

                            {order.status === 'PREPARING' && (
                              isDelivery ? (
                                <button
                                  type="button"
                                  disabled={updatingId === order.id}
                                  onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Truck size={13} />
                                  Despachar / Saiu para Entrega
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={updatingId === order.id}
                                  onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Store size={13} />
                                  Pronto para Retirada
                                </button>
                              )
                            )}

                            {(order.status === 'SHIPPED' || order.status === 'READY_FOR_PICKUP') && (
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <CheckCircle size={13} />
                                Marcar como Entregue
                              </button>
                            )}

                            {order.status === 'DELIVERED' && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/40">
                                <Clock size={13} />
                                <span>Aguardando confirmação de recebimento pelo tutor</span>
                              </div>
                            )}

                            {order.status === 'COMPLETED' && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                                <CheckCircle size={13} />
                                <span>Concluído (Confirmado pelo tutor)</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 dark:text-[#8E918F]">Total:</span>
                            <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-[#E3E3E3]">
                              R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Establishment Cancellation Modal */}
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
                  <span>Cancelar Pedido #{cancelModalOrder.orderNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmittingCancel && setCancelModalOrder(null)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Atenção:</p>
                <p>
                  O cancelamento devolverá automaticamente o estoque de todos os itens do pedido e notificará o cliente.
                </p>
              </div>

              <form onSubmit={handleConfirmCancellation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1.5">
                    Motivo do cancelamento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    className="w-full text-xs font-medium bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl px-3 py-2 text-neutral-800 dark:text-[#E3E3E3] focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value="">Selecione um motivo...</option>
                    {CANCELLATION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
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
                    placeholder={
                      cancelReason === 'Outro'
                        ? 'Descreva detalhadamente o motivo...'
                        : 'Informações para registrar no histórico do pedido (opcional)...'
                    }
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
    </div>
  );
}
