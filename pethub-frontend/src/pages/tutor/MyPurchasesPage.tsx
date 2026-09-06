import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowLeft, Search, CheckCircle, Package, Clock, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button, Badge } from '@/components/ui';
import { useToast } from '@/store/toastStore';

export default function MyPurchasesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const handleBuyAgain = async (item: any) => {
    try {
      await api.post('/cart/items', { productId: item.product.id, quantity: item.quantity });
      toast.success('Produto adicionado ao carrinho ✓');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Este produto não está disponível no momento.');
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'PENDING': return { label: 'Aguardando Pagamento', icon: <Clock size={14} />, color: 'warning' };
      case 'PAID': return { label: 'Pago', icon: <CheckCircle size={14} />, color: 'success' };
      case 'SHIPPED': return { label: 'Em transporte', icon: <Package size={14} />, color: 'info' };
      case 'DELIVERED': return { label: 'Concluído ✓', icon: <CheckCircle size={14} />, color: 'success' };
      case 'CANCELLED': return { label: 'Cancelado', icon: <XCircle size={14} />, color: 'danger' };
      default: return { label: status, icon: null, color: 'info' };
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
          <div className="text-5xl mb-4">🐾</div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Você ainda não fez nenhuma compra</h2>
          <p className="text-neutral-500 dark:text-[#8E918F] mb-6 max-w-sm">
            Encontre produtos incríveis para deixar seu pet ainda mais feliz.
          </p>
          <Button onClick={() => navigate('/tutor/explore')} size="lg" leftIcon={<ShoppingBag size={18} />}>
            Explorar produtos
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={statusInfo.color as any} className="flex items-center gap-1.5 px-2 py-1">
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                    <span className="text-xs text-neutral-400 dark:text-[#8E918F]">Pedido #{order.id.slice(0, 8)}</span>
                  </div>
                  
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 mb-3 last:mb-0">
                      <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-[#282A2C] overflow-hidden shrink-0">
                        {item.product.photo ? (
                          <img src={item.product.photo} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] line-clamp-1">{item.product.name}</h3>
                        <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{item.establishment?.name || 'Loja Parceira'}</p>
                        <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{item.quantity} {item.quantity > 1 ? 'unidades' : 'unidade'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-neutral-100 dark:border-[#313335] pt-3 sm:pt-0 sm:pl-4">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mb-1">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-lg">R$ {order.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detalhes Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Detalhes da Compra</h2>
                  <p className="text-neutral-500 dark:text-[#8E918F] text-sm">Pedido #{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-full cursor-pointer">
                  <XCircle size={24} className="text-neutral-400 dark:text-[#8E918F]" />
                </button>
              </div>

              <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] rounded-2xl p-4 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-1">Data da compra</p>
                  <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-1">Status</p>
                  <Badge variant={getStatusInfo(selectedOrder.status).color as any} className="flex items-center gap-1.5 px-2 py-1">
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] border-b border-neutral-100 dark:border-[#313335] pb-2">Produtos ({selectedOrder.items.length})</h3>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-2xl p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-[#282A2C] overflow-hidden shrink-0">
                        {item.product.photo ? (
                          <img src={item.product.photo} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 dark:text-[#E3E3E3] line-clamp-1">{item.product.name}</h4>
                        <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{item.establishment?.name || 'Loja Parceira'}</p>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-sm font-medium text-neutral-900 dark:text-[#E3E3E3]">{item.quantity}x R$ {item.priceAtTime.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botão comprar novamente */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-[#313335]">
                      <Button variant="outline" size="sm" fullWidth onClick={() => handleBuyAgain(item)}>
                        🛒 Comprar novamente
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t border-neutral-100 dark:border-[#313335] pt-4">
                <div className="flex justify-between items-center mb-2 text-sm text-neutral-500 dark:text-[#8E918F]">
                  <span>Forma de pagamento</span>
                  <span className="text-neutral-800 dark:text-[#E3E3E3]">{selectedOrder.paymentMethod || 'Não informado'}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  <span>Total Pago</span>
                  <span className="text-orange-600 dark:text-orange-400">R$ {selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
