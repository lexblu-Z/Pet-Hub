import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { ClipboardList, Package, User, Calendar, DollarSign, Filter, Search, ChevronDown, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import { Input, Button, Badge, Avatar } from '@/components/ui';

interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  photo: string | null;
  quantity: number;
  priceAtTime: number;
  subtotal: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: string | null;
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
  SHIPPED: { label: 'Em Preparo / Enviado', badge: 'brand', icon: Truck },
  DELIVERED: { label: 'Entregue / Concluído', badge: 'success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', badge: 'error', icon: XCircle },
};

export default function EstablishmentOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/establishment/orders/${orderId}/status`, { status: newStatus });
      toast.success('Status do pedido atualizado!');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.tutor.name.toLowerCase().includes(q) ||
      o.tutor.email.toLowerCase().includes(q) ||
      o.items.some(it => it.productName.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pedidos de Clientes</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Acompanhe e despache compras de produtos realizadas pelos tutores
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-neutral-700">
            Total: {orders.length}
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            Pendentes: {orders.filter(o => o.status === 'PENDING').length}
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por nº do pedido, cliente ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'PAID', label: 'Confirmados' },
            { id: 'SHIPPED', label: 'Em Preparo' },
            { id: 'DELIVERED', label: 'Concluídos' },
            { id: 'CANCELLED', label: 'Cancelados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl transition-all font-medium ${
                statusFilter === f.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando pedidos do banco...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <ClipboardList size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum pedido encontrado</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Quando os tutores comprarem produtos do seu catálogo, os pedidos com dados do cliente e itens aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const statusConfig = statusLabels[order.status] || statusLabels.PENDING;
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-base text-neutral-900">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={statusConfig.badge}>
                      <StatusIcon size={12} className="mr-1 inline" />
                      {statusConfig.label}
                    </Badge>

                    {/* Change Status Dropdown */}
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="PAID">Confirmado</option>
                      <option value="SHIPPED">Em Preparo / A Caminho</option>
                      <option value="DELIVERED">Entregue / Concluído</option>
                      <option value="CANCELLED">Cancelar Pedido</option>
                    </select>
                  </div>
                </div>

                {/* Customer & Items Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <div className="p-3.5 bg-neutral-50/70 rounded-xl border border-neutral-100 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Dados do Cliente
                    </span>
                    <div className="flex items-center gap-3">
                      <Avatar src={order.tutor.avatar || '/user.jpg'} name={order.tutor.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900 text-xs truncate">{order.tutor.name}</p>
                        <p className="text-[11px] text-neutral-500 truncate">{order.tutor.email}</p>
                        <p className="text-[11px] text-neutral-500">{order.tutor.phone || 'Sem telefone'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="lg:col-span-2 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Produtos do Pedido ({order.items.length})
                    </span>
                    <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
                      {order.items.map((it) => (
                        <div key={it.id} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                              {it.photo ? (
                                <img src={it.photo} alt={it.productName} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={14} className="text-neutral-400" />
                              )}
                            </div>
                            <span className="font-medium text-neutral-800 truncate">{it.productName}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 text-neutral-600">
                            <span>{it.quantity}x R$ {it.priceAtTime.toFixed(2).replace('.', ',')}</span>
                            <span className="font-bold text-neutral-900 min-w-[70px] text-right">
                              R$ {it.subtotal.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total Footer */}
                <div className="pt-2 flex justify-end items-center gap-3">
                  <span className="text-xs text-neutral-500">Total do Pedido:</span>
                  <span className="text-lg font-black text-neutral-900">
                    R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
