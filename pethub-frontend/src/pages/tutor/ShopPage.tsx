import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, X, Store, Check, Package, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/store/toastStore';
import { Button, SearchBar, Badge, EmptyState } from '@/components/ui';
import { api } from '@/services/api';

interface RealProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  photo?: string;
  establishmentId: string;
  establishment?: {
    id: string;
    name: string;
    establishmentProfile?: {
      businessName?: string;
      city?: string;
    };
  };
}

export default function ShopPage() {
  const [products, setProducts] = useState<RealProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RealProduct | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { items, addItem, removeItem, updateQuantity, total, itemCount, clearCart } = useCartStore();
  const toast = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
    (p.establishment?.establishmentProfile?.businessName || p.establishment?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenProduct = (product: RealProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleAddToCart = (product: RealProduct, qty: number) => {
    addItem({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      photos: [product.photo || '/romeu_e_julieta_1788367558045.jpg'],
      category: 'outros',
      isActive: true,
      establishmentId: product.establishmentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any, qty);

    toast.success('Adicionado ao carrinho!', `${qty}x ${product.name}`);
    setSelectedProduct(null);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    toast.success('Pedido realizado com sucesso!', 'Em breve você receberá atualizações sobre o envio.');
    clearCart();
    setIsCartOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Standard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Loja PetHub</h1>
          <p className="text-neutral-500 text-sm">Produtos reais de pet shops e clínicas parceiras</p>
        </div>
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-700 hover:text-orange-500 transition-colors"
          title="Ver carrinho"
        >
          <ShoppingCart size={20} />
          {itemCount() > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow">
              {itemCount()}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div>
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Buscar por produto, marca ou pet shop..."
          className="w-full"
        />
      </div>

      {/* Products Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            imageUrl="/salsicha_borzoi_1788367580508.jpg"
            title="Ainda não há produtos disponíveis"
            description="Os estabelecimentos parceiros estão cadastrando seus estoques. Volte em breve para conferir as novidades!"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const sellerName = product.establishment?.establishmentProfile?.businessName || product.establishment?.name || 'Pet Shop Parceiro';
              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -3 }}
                  onClick={() => handleOpenProduct(product)}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer group"
                >
                  <div className="relative aspect-square bg-neutral-50 overflow-hidden">
                    <img
                      src={product.photo || '/romeu_e_julieta_1788367558045.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.stock <= 3 && product.stock > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                          Restam {product.stock}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-1">
                        <Store size={12} className="shrink-0 text-orange-500" />
                        <span className="truncate">{sellerName}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-neutral-900 line-clamp-2 mb-2 group-hover:text-orange-500 transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-50">
                      <span className="text-base font-bold text-neutral-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product, 1);
                        }}
                        className="w-8 h-8 rounded-xl bg-orange-50 hover:bg-orange-500 text-orange-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Adicionar ao carrinho"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-neutral-500 hover:text-neutral-900 shadow transition-colors z-20"
              >
                <X size={18} />
              </button>

              <div className="relative h-64 sm:h-72 bg-neutral-100 shrink-0">
                <img
                  src={selectedProduct.photo || '/romeu_e_julieta_1788367558045.jpg'}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="brand">
                    <Store size={12} className="mr-1 inline" />
                    {selectedProduct.establishment?.establishmentProfile?.businessName || selectedProduct.establishment?.name || 'Pet Shop Parceiro'}
                  </Badge>
                  {selectedProduct.stock > 0 ? (
                    <Badge variant="success">Em estoque ({selectedProduct.stock} un.)</Badge>
                  ) : (
                    <Badge variant="error">Indisponível</Badge>
                  )}
                </div>

                <h2 className="text-xl font-bold text-neutral-900">
                  {selectedProduct.name}
                </h2>

                <p className="text-2xl font-bold text-orange-500">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price)}
                </p>

                {selectedProduct.description && (
                  <div>
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Descrição</h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {selectedProduct.stock > 0 && (
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">Quantidade:</span>
                    <div className="flex items-center gap-3 bg-neutral-100 rounded-xl px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="text-neutral-600 hover:text-neutral-900"
                        disabled={quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-sm w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                        className="text-neutral-600 hover:text-neutral-900"
                        disabled={quantity >= selectedProduct.stock}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-100 shrink-0 flex gap-3">
                <Button
                  fullWidth
                  size="lg"
                  disabled={selectedProduct.stock <= 0}
                  onClick={() => handleAddToCart(selectedProduct, quantity)}
                >
                  Adicionar ao carrinho ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price * quantity)})
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Drawer Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <h2 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-orange-500" />
                  Seu Carrinho
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-900">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-16 text-neutral-400">
                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-neutral-600">Seu carrinho está vazio</p>
                    <p className="text-xs text-neutral-400 mt-1">Navegue pelos produtos e adicione seus itens</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl">
                      <img src={item.product.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover bg-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{item.product.name}</p>
                        <p className="text-sm text-orange-600 font-bold mt-0.5">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200 p-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 text-neutral-400 hover:text-neutral-900">
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 text-neutral-400 hover:text-neutral-900">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="pt-4 border-t border-neutral-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Total:</span>
                    <span className="text-xl font-bold text-neutral-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total())}
                    </span>
                  </div>
                  <Button fullWidth size="lg" onClick={handleCheckout}>
                    Finalizar Pedido
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
