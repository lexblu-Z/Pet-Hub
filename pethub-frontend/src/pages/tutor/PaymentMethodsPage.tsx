import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Trash2, Shield, ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Button, Input, Card, Modal } from '@/components/ui';

interface PaymentMethod {
  id: string;
  brand: string;
  lastFour: string;
  holder: string;
  isDefault: boolean;
}

const brandColors: Record<string, string> = {
  Visa: 'bg-blue-600',
  Mastercard: 'bg-red-600',
  Elo: 'bg-yellow-500',
  Desconhecido: 'bg-neutral-500',
};

const brandIcon = (brand: string) => {
  const colors: Record<string, string> = { Visa: '💳', Mastercard: '💳', Elo: '💳' };
  return colors[brand] || '💳';
};

const detectBrand = (number: string) => {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo';
  return 'Desconhecido';
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const [newCard, setNewCard] = useState({ number: '', holder: '', expiry: '' });

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => { fetchMethods(); }, []);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/payment-methods');
      setMethods(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.number || !newCard.holder) {
      toast.error('Preencha todos os campos');
      return;
    }
    const lastFour = newCard.number.replace(/\s/g, '').slice(-4);
    if (!/^\d{4}$/.test(lastFour)) {
      toast.error('Número do cartão inválido');
      return;
    }
    try {
      setSaving(true);
      const brand = detectBrand(newCard.number);
      await api.post('/users/me/payment-methods', {
        brand,
        lastFour,
        holder: newCard.holder,
      });
      toast.success('Cartão adicionado!');
      setNewCard({ number: '', holder: '', expiry: '' });
      setShowAddForm(false);
      fetchMethods();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar cartão');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setSaving(true);
      await api.delete(`/users/me/payment-methods/${deletingId}`, {
        data: { password: passwordConfirm },
      });
      toast.success('Cartão removido');
      setDeletingId(null);
      setPasswordConfirm('');
      fetchMethods();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Senha incorreta');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/users/me/payment-methods/${id}/default`);
      fetchMethods();
    } catch {
      toast.error('Erro ao definir cartão padrão');
    }
  };

  const formatNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tutor/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-neutral-600 dark:text-[#E3E3E3]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              Formas de pagamento
            </h1>
            <p className="text-sm text-neutral-500 dark:text-[#8E918F]">Cartões e métodos salvos</p>
          </div>
        </div>
        {!showAddForm && (
          <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddForm(true)}>
            Adicionar
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card padding="lg" className="border border-orange-200 dark:border-orange-900/50">
              <h2 className="font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Novo cartão</h2>
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#8E918F] mb-4 bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] rounded-xl p-3">
                <Shield size={14} className="text-green-500 shrink-0" />
                <span>Apenas os 4 últimos dígitos são armazenados. CVV nunca é salvo.</span>
              </div>
              <form onSubmit={handleAddCard} className="space-y-4">
                <Input
                  label="Número do cartão"
                  value={newCard.number}
                  onChange={e => setNewCard({ ...newCard, number: formatNumber(e.target.value) })}
                  placeholder="0000 0000 0000 0000"
                  leftIcon={<CreditCard size={16} />}
                  hint={newCard.number ? `Bandeira detectada: ${detectBrand(newCard.number)}` : undefined}
                />
                <Input
                  label="Nome do titular"
                  value={newCard.holder}
                  onChange={e => setNewCard({ ...newCard, holder: e.target.value.toUpperCase() })}
                  placeholder="NOME COMO NO CARTÃO"
                />
                <Input
                  label="Validade (MM/AA)"
                  value={newCard.expiry}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                    setNewCard({ ...newCard, expiry: v });
                  }}
                  placeholder="MM/AA"
                />
                <div className="flex gap-2 pt-2">
                  <Button type="submit" fullWidth isLoading={saving}>Adicionar cartão</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-neutral-100 dark:bg-[#282A2C] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <Card padding="lg" className="text-center border border-neutral-100 dark:border-[#313335]">
          <CreditCard size={40} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="font-semibold text-neutral-700 dark:text-[#E3E3E3]">Nenhum cartão salvo</p>
          <p className="text-sm text-neutral-400 dark:text-[#8E918F] mt-1 mb-4">Adicione um cartão para agilizar suas compras</p>
          <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddForm(true)}>
            Adicionar cartão
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {methods.map(method => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm p-4 flex items-center gap-4"
            >
              <div className={`w-12 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${brandColors[method.brand] || 'bg-neutral-400'}`}>
                {method.brand.slice(0, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{method.brand} •••• {method.lastFour}</p>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">{method.holder}</p>
              </div>
              <div className="flex items-center gap-2">
                {method.isDefault ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded-lg">
                    <Star size={11} fill="currentColor" /> Padrão
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="text-xs text-neutral-400 dark:text-[#8E918F] hover:text-orange-500 dark:hover:text-orange-400 transition-colors px-2 py-1 cursor-pointer"
                  >
                    Definir padrão
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(method.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 dark:text-[#8E918F] hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => { setDeletingId(null); setPasswordConfirm(''); }}
        title="Remover cartão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-[#C4C7C5]">Para confirmar a remoção, informe sua senha de acesso:</p>
          <Input
            label="Sua senha"
            type="password"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="••••••"
            leftIcon={<Shield size={16} />}
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
              isLoading={saving}
              disabled={!passwordConfirm}
            >
              Confirmar remoção
            </Button>
            <Button variant="ghost" onClick={() => { setDeletingId(null); setPasswordConfirm(''); }}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
