import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, X, Store, Package, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/store/toastStore';
import { Button, SearchBar, Badge } from '@/components/ui';
import { api } from '@/services/api';
import { CheckoutModal } from '@/components/shared/CheckoutModal';
import { ItemLogo } from '@/components/shared/ServiceLogo';
import { ProductImage } from '@/components/shared/ProductImage';
import { getFullImageUrl } from '@/utils/image';

interface RealProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  photo?: string | null;
  photos?: string[];
  establishmentId: string;
  isProgramPartner?: boolean;
  establishment?: {
    id: string;
    name: string;
    avatar?: string | null;
    defaultAvatar?: string | null;
    phone?: string | null;
    establishmentProfile?: {
      businessName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      photos?: string[];
    };
  };
}

export default function ShopPage() {
  const [products, setProducts] = useState<RealProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RealProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<{ product: any; quantity: number } | null>(null);

  const { items, addItem, updateQuantity, total, itemCount, clearCart } = useCartStore();
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

  const filteredProducts = products
    .filter(p =>
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.establishment?.establishmentProfile?.businessName || p.establishment?.name || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (Boolean(a.isProgramPartner) === Boolean(b.isProgramPartner)) return 0;
      return a.isProgramPartner ? -1 : 1;
    });

  const getEstablishmentPhoto = (product: RealProduct) => {
    const raw = product.establishment?.establishmentProfile?.photos?.[0] ||
      product.establishment?.avatar ||
      product.establishment?.defaultAvatar ||
      null;
    return raw ? getFullImageUrl(raw) : null;
  };

  const handleOpenProduct = (product: RealProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleAddToCart = (product: RealProduct, qty: number, showToast = true) => {
    if (product.stock <= 0) {
      toast.error('Produto sem estoque disponível.');
      return;
    }
    if (qty > product.stock) {
      toast.error(`A quantidade não pode exceder o estoque disponível (${product.stock} un.).`);
      return;
    }

    const productPhoto = product.photo || (Array.isArray(product.photos) && product.photos[0]) || null;

    addItem({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      photo: productPhoto,
      photos: productPhoto ? [productPhoto] : (Array.isArray(product.photos) ? product.photos : []),
      category: 'outros',
      isActive: true,
      establishmentId: product.establishmentId,
      establishment: product.establishment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any, qty);

    if (showToast) {
      toast.success('Adicionado ao carrinho!', `${qty}x ${product.name}`);
    }
    setSelectedProduct(null);
  };

  const handleBuyNow = (product: RealProduct, qty = 1) => {
    if (product.stock <= 0) {
      toast.error('Produto sem estoque disponível.');
      return;
    }
    if (qty > product.stock) {
      toast.error(`A quantidade não pode exceder o estoque disponível (${product.stock} un.).`);
      return;
    }

    const productPhoto = product.photo || (Array.isArray(product.photos) && product.photos[0]) || null;

    setDirectCheckoutItem({
      product: {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        stock: product.stock,
        photo: productPhoto,
        photos: productPhoto ? [productPhoto] : (Array.isArray(product.photos) ? product.photos : []),
        category: 'outros',
        isActive: true,
        establishmentId: product.establishmentId,
        establishment: product.establishment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      quantity: qty,
    });
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setDirectCheckoutItem(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Standard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Loja PetHub</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm">Produtos reais de pet shops e clínicas parceiras</p>
        </div>
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xs border border-neutral-200 dark:border-[#313335] text-neutral-800 dark:text-[#E3E3E3] hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer font-bold text-sm"
          title="Ver carrinho"
        >
          <ShoppingCart size={18} className="text-orange-500" />
          <span className="hidden sm:inline">Carrinho</span>
          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            {itemCount()}
          </span>
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
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-neutral-100 dark:bg-[#282A2C] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-10 border border-neutral-100 dark:border-[#313335] text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-500">
              <Package size={32} />
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base mb-1">Não há produtos disponíveis no momento.</h3>
            <p className="text-neutral-400 dark:text-[#8E918F] text-xs max-w-md mx-auto leading-relaxed">
              Os estabelecimentos parceiros estão cadastrando novos produtos no catálogo. Volte em breve para conferir as novidades!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const sellerName = product.establishment?.establishmentProfile?.businessName || product.establishment?.name || 'Pet Shop Parceiro';
              const estabPhoto = getEstablishmentPhoto(product);
              const isOutOfStock = product.stock <= 0;

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -3 }}
                  className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                >
                  <div
                    onClick={() => handleOpenProduct(product)}
                    className="relative aspect-square bg-neutral-50 dark:bg-[#282A2C] overflow-hidden cursor-pointer"
                  >
                    <ProductImage
                      product={product}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      iconSize={36}
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {product.isProgramPartner && (
                        <span className="bg-emerald-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 border border-emerald-400/30">
                          <ShieldCheck size={11} />
                          Parceiro
                        </span>
                      )}
                      {isOutOfStock ? (
                        <span className="bg-neutral-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                          Sem estoque
                        </span>
                      ) : product.stock <= 3 ? (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                          Restam {product.stock} un.
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                          Em estoque
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div onClick={() => handleOpenProduct(product)} className="cursor-pointer">
                      {/* Discrete establishment identification badge */}
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-[#8E918F] mb-1.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-orange-100 dark:bg-orange-950/40 border border-neutral-200/60 dark:border-[#313335] flex items-center justify-center">
                          {estabPhoto ? (
                            <img
                              src={estabPhoto}
                              alt={sellerName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Store size={11} className="text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                        <span className="truncate font-medium text-neutral-700 dark:text-[#C4C7C5]">{sellerName}</span>
                      </div>

                      <h3 className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3] line-clamp-2 mb-1 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-neutral-400 dark:text-[#8E918F] line-clamp-2 mb-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3] mb-3">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNow(product);
                          }}
                          className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-xs hover:shadow"
                        >
                          {isOutOfStock ? 'Esgotado' : 'Comprar agora'}
                        </button>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProduct(product);
                          }}
                          className="w-9 h-9 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                          title="Selecionar quantidade e adicionar ao carrinho"
                        >
                          <ShoppingCart size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Details & Quantity Modal */}
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
              className="relative w-full max-w-lg bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 dark:bg-[#282A2C]/80 backdrop-blur-sm flex items-center justify-center text-neutral-500 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white shadow transition-colors z-20 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Product Photo Showcase: object-contain without cutting */}
              <div className="relative h-64 sm:h-72 bg-neutral-50 dark:bg-[#282A2C] border-b border-neutral-100 dark:border-[#313335] flex items-center justify-center p-4 overflow-hidden shrink-0">
                <ProductImage
                  product={selectedProduct}
                  alt={selectedProduct.name}
                  className="max-h-full max-w-full object-contain drop-shadow-xs transition-transform duration-300 hover:scale-102"
                  iconSize={48}
                  containerClassName="w-full h-full"
                />
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Seller badge with small establishment photo */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40">
                    <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-white dark:bg-[#1E1F20] border border-orange-200 dark:border-orange-800 flex items-center justify-center">
                      {getEstablishmentPhoto(selectedProduct) ? (
                        <img
                          src={getEstablishmentPhoto(selectedProduct)!}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Store size={10} className="text-orange-500" />
                      )}
                    </div>
                    <span>
                      {selectedProduct.establishment?.establishmentProfile?.businessName || selectedProduct.establishment?.name || 'Pet Shop Parceiro'}
                    </span>
                  </div>

                  {selectedProduct.stock > 0 ? (
                    <Badge variant="success">Em estoque ({selectedProduct.stock} un.)</Badge>
                  ) : (
                    <Badge variant="error">Sem estoque</Badge>
                  )}
                </div>

                <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  {selectedProduct.name}
                </h2>

                <p className="text-2xl font-bold text-orange-500">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price)}
                </p>

                {selectedProduct.description && (
                  <div>
                    <h4 className="text-xs font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider mb-1">Descrição</h4>
                    <p className="text-sm text-neutral-600 dark:text-[#C4C7C5] leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {selectedProduct.stock > 0 ? (
                  <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-neutral-700 dark:text-[#E3E3E3]">Quantidade:</span>
                      <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">Máximo: {selectedProduct.stock} unidades</p>
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-100 dark:bg-[#282A2C] rounded-xl px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        disabled={quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-sm w-6 text-center text-neutral-900 dark:text-[#E3E3E3]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                        className="text-neutral-600 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        disabled={quantity >= selectedProduct.stock}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-100 dark:bg-[#282A2C] rounded-xl text-center text-xs text-neutral-500 dark:text-[#8E918F] font-medium">
                    Este produto está indisponível no momento.
                  </div>
                )}
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-[#1E1F20] border-t border-neutral-100 dark:border-[#313335] shrink-0 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={selectedProduct.stock <= 0}
                  onClick={() => handleAddToCart(selectedProduct, quantity)}
                  className="flex-1 font-semibold"
                >
                  Adicionar ao carrinho
                </Button>
                <Button
                  size="lg"
                  disabled={selectedProduct.stock <= 0}
                  onClick={() => {
                    handleBuyNow(selectedProduct, quantity);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  Comprar agora ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price * quantity)})
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
              className="relative w-full max-w-md bg-white dark:bg-[#1E1F20] border-l border-neutral-100 dark:border-[#313335] h-full shadow-2xl z-10 flex flex-col p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-[#313335]">
                <h2 className="font-bold text-lg text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
                  <ShoppingCart size={20} className="text-orange-500" />
                  Seu Carrinho ({itemCount()})
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-neutral-400 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-16 text-neutral-400 dark:text-[#8E918F]">
                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-neutral-600 dark:text-[#C4C7C5]">Seu carrinho está vazio</p>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-1">Navegue pela loja e adicione produtos reais</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white dark:bg-[#1E1F20] border border-neutral-200/50 dark:border-[#313335] flex items-center justify-center">
                        <ProductImage
                          product={item.product}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          iconSize={22}
                          containerClassName="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <ItemLogo size="xs" />
                          <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] truncate">{item.product.name}</p>
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-bold mt-0.5">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335] p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-neutral-400 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center text-neutral-900 dark:text-[#E3E3E3]">{item.quantity}</span>
                        <button
                          onClick={() => {
                            if (item.quantity >= item.product.stock) {
                              toast.error(`Limite de estoque atingido (${item.product.stock} un.).`);
                              return;
                            }
                            updateQuantity(item.product.id, item.quantity + 1);
                          }}
                          disabled={item.quantity >= item.product.stock}
                          className="p-1 text-neutral-400 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 dark:text-[#8E918F] font-medium">Total:</span>
                    <span className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total())}
                    </span>
                  </div>
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleOpenCheckout}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    Finalizar Pedido
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Structured Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectCheckoutItem(null);
        }}
        onSuccess={() => {
          if (!directCheckoutItem) {
            clearCart();
          }
          setDirectCheckoutItem(null);
          fetchProducts();
        }}
        cartItems={
          directCheckoutItem
            ? [{ product: directCheckoutItem.product, quantity: directCheckoutItem.quantity }]
            : items
        }
        totalAmount={
          directCheckoutItem
            ? directCheckoutItem.product.price * directCheckoutItem.quantity
            : total()
        }
      />
    </div>
  );
}
