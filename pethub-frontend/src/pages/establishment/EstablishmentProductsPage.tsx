import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Package, Plus, Edit2, Trash2, DollarSign, AlertCircle, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { Input, Button, Modal, Badge } from '@/components/ui';

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

interface ProductItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  photo: string | null;
}

const productCategories = [
  'Rações e Alimentos',
  'Petiscos e Snacks',
  'Higiene e Beleza',
  'Brinquedos',
  'Acessórios e Coleiras',
  'Medicamentos e Vitaminas',
  'Caminhas e Casinhas',
  'Outros',
];

export default function EstablishmentProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Rações e Alimentos');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [photo, setPhoto] = useState('');

  const toast = useToast();
  const productFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleProductFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData);
      if (res.data?.url) {
        setPhoto(res.data.url);
        toast.success('Foto carregada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploadingPhoto(false);
      if (productFileRef.current) productFileRef.current.value = '';
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/establishment/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategory('Rações e Alimentos');
    setPrice('');
    setStock('10');
    setPhoto('');
    setModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setCategory(p.category || 'Rações e Alimentos');
    setPrice(String(p.price));
    setStock(String(p.stock));
    setPhoto(p.photo || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do produto é obrigatório.');
      return;
    }
    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Informe um preço maior que zero.');
      return;
    }
    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      toast.error('Informe uma quantidade de estoque válida.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        price: numPrice,
        stock: numStock,
        photo: photo.trim() || undefined,
      };

      if (editingId) {
        await api.put(`/establishment/products/${editingId}`, payload);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await api.post('/establishment/products', payload);
        toast.success('Produto cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar produto.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await api.delete(`/establishment/products/${id}`);
      toast.success('Produto removido.');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover produto.');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStockCount = products.filter(p => p.stock <= 3).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Catálogo de Produtos</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Gerencie o estoque, preços e fotos dos produtos comercializados na plataforma
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
          <Plus size={16} className="mr-1.5" /> Novo Produto
        </Button>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="text-amber-600 shrink-0" />
            <p className="text-xs font-semibold">
              Atenção: <strong>{lowStockCount} produto(s)</strong> estão com estoque baixo (3 unidades ou menos).
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg">
            Repor Estoque
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-100 shadow-xs max-w-md">
        <Input
          placeholder="Buscar produto por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
        />
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando produtos do banco...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <Package size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum produto cadastrado</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
            Cadastre rações, petiscos e acessórios para que os tutores possam comprar diretamente pela loja online.
          </p>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={16} className="mr-1" /> Cadastrar Primeiro Produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const isLowStock = p.stock <= 3;
            const isOutOfStock = p.stock === 0;

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs flex flex-col group hover:shadow-sm transition-all">
                {/* Product Photo */}
                <div className="h-40 bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                  {p.photo ? (
                    <img src={getFullImageUrl(p.photo)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Package size={40} className="text-neutral-300" />
                  )}

                  {/* Stock Badge */}
                  <div className="absolute top-2 left-2">
                    {isOutOfStock ? (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        Esgotado
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        ⚠️ Restam {p.stock}
                      </span>
                    ) : (
                      <span className="bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Estoque: {p.stock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {p.category || 'Geral'}
                    </span>
                    <h3 className="font-bold text-neutral-900 text-sm line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {p.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-50 flex items-center justify-between">
                    <span className="font-extrabold text-neutral-900 text-base">
                      R$ {p.price.toFixed(2).replace('.', ',')}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Editar Produto' : 'Novo Produto'}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Nome do Produto *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ração Golden Special Frango 15kg"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço de Venda (R$) *"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="149,90"
                leftIcon={<DollarSign size={14} />}
                required
              />
              <Input
                label="Quantidade em Estoque *"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs bg-white"
              >
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detalhes sobre o produto, indicações, peso, validade..."
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-800 resize-none"
              />
            </div>

            {/* Real Product Image Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 uppercase">
                Foto do Produto
              </label>
              <input
                type="file"
                ref={productFileRef}
                accept="image/*"
                className="hidden"
                onChange={handleProductFile}
              />
              
              {photo ? (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200 h-36 bg-neutral-50 group">
                  <img src={getFullImageUrl(photo)} alt="Preview do produto" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => productFileRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-neutral-900 rounded-lg text-xs font-bold shadow hover:bg-neutral-100"
                    >
                      Alterar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoto('')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow hover:bg-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => productFileRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full border-2 border-dashed border-neutral-300 hover:border-orange-500 bg-neutral-50 hover:bg-orange-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-neutral-600 transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <Upload size={18} className={isUploadingPhoto ? "animate-bounce" : ""} />
                  </div>
                  <span className="text-xs font-bold text-neutral-800">
                    {isUploadingPhoto ? 'Enviando imagem...' : 'Adicionar foto do produto'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Selecione do computador ou celular (PNG, JPG)
                  </span>
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
