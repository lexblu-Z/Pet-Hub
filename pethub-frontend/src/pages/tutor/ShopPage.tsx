import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { products } from '@/data/products';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/store/toastStore';
import { Button, SearchBar, Badge, EmptyState } from '@/components/ui';

export default function ShopPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const { items, addItem, removeItem, updateQuantity, total, itemCount, clearCart } = useCartStore();
  const toast = useToast();

  const categories = [
    { id: 'all', label: 'Todos os Produtos' },
    { id: 'racao', label: 'Rações' },
    { id: 'petisco', label: 'Petiscos' },
    { id: 'brinquedo', label: 'Brinquedos' },
    { id: 'acessorio', label: 'Acessórios' },
    { id: 'higiene', label: 'Higiene' },
    { id: 'medicamento', label: 'Medicamentos' },
  ];

  const filteredProducts = products.filter(p => 
    p.isActive &&
    (activeCategory === 'all' || p.category === activeCategory) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand?.toLowerCase() || '').includes(search.toLowerCase()))
  );

  const handleAddToCart = (product: typeof products[0]) => {
    addItem(product, 1);
    toast.success('Adicionado ao carrinho', product.name);
  };

  const handleCheckout = () => {
    toast.success('Pedido realizado com sucesso!', 'Em breve você receberá atualizações.');
    clearCart();
    setIsCartOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6 h-[calc(100vh-theme(spacing.16))] relative overflow-hidden">
      
      {/* Main Shop Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Loja PetHub</h1>
            <p className="text-neutral-500 text-sm mt-1">Os melhores produtos para o seu pet</p>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden relative p-3 bg-white rounded-xl shadow-sm border border-neutral-100 text-neutral-600 hover:text-orange-500"
          >
            <ShoppingCart size={20} />
            {itemCount() > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount()}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-4 mb-6 shrink-0 flex-col sm:flex-row">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            onClear={() => setSearch('')}
            placeholder="Buscar produtos, marcas..." 
            className="flex-1"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border-2 ${
                activeCategory === cat.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-neutral-100 bg-white text-neutral-600 hover:border-orange-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0 pr-1">
          {filteredProducts.length === 0 ? (
            <EmptyState emoji="🛍️" title="Nenhum produto encontrado" />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="relative aspect-square">
                    <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover" />
                    {product.stock < 5 && product.stock > 0 && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg backdrop-blur-sm">
                        Últimos itens
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs text-neutral-400 mb-1 font-medium uppercase">{product.brand}</p>
                    <h3 className="font-semibold text-neutral-900 text-sm line-clamp-2 mb-2 flex-1">{product.name}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="font-bold text-orange-600">R${product.price.toFixed(2)}</p>
                      <button 
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className="w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart Sidebar */}
      <div className="hidden lg:flex w-96 bg-white border border-neutral-100 rounded-3xl shadow-sm flex-col overflow-hidden shrink-0">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-neutral-700" />
            <h2 className="font-bold text-neutral-900">Meu Carrinho</h2>
          </div>
          <Badge variant="brand">{itemCount()} itens</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500">
              <ShoppingCart size={48} className="mb-4 text-neutral-200" />
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-4">
                  <img src={item.product.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover border border-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-neutral-900 truncate">{item.product.name}</p>
                    <p className="font-bold text-orange-600 text-sm mt-1">R${item.product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 bg-white rounded-md flex items-center justify-center shadow-sm">
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 bg-white rounded-md flex items-center justify-center shadow-sm">
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="text-xs text-red-500 hover:underline">
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-neutral-100 bg-neutral-50/50">
            <div className="flex justify-between mb-2 text-sm text-neutral-500">
              <span>Subtotal</span>
              <span>R${total().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 font-bold text-neutral-900 text-lg">
              <span>Total</span>
              <span>R${total().toFixed(2)}</span>
            </div>
            <Button fullWidth size="lg" onClick={handleCheckout}>
              Finalizar Compra
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Cart Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsCartOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl z-50 flex flex-col lg:hidden shadow-2xl">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-bold text-lg">Carrinho ({itemCount()})</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-neutral-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.length === 0 ? (
                  <p className="text-center text-neutral-500 py-10">Carrinho vazio</p>
                ) : (
                  items.map(item => (
                    <div key={item.product.id} className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0">
                      <img src={item.product.photos[0]} alt="" className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2">{item.product.name}</p>
                        <p className="font-bold text-orange-600 mt-1">R${item.product.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-3 bg-neutral-100 rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 && (
                <div className="p-4 border-t border-neutral-100 pb-safe">
                  <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Total:</span>
                    <span>R${total().toFixed(2)}</span>
                  </div>
                  <Button fullWidth size="lg" onClick={handleCheckout}>Finalizar Compra</Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
