import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Star,
  Trash2,
  Edit3,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Building,
  Info,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { Button, Modal, ConfirmModal } from '@/components/ui';
import type { UserAddress } from '@/types';

interface TutorAddressManagementProps {
  onBack?: () => void;
  isStandalone?: boolean;
}

interface AddressFormData {
  label: string;
  customLabel: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

const INITIAL_FORM_STATE: AddressFormData = {
  label: 'Casa',
  customLabel: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: 'Ourinhos',
  state: 'SP',
  zipCode: '',
  isDefault: false,
};

export const TutorAddressManagement: React.FC<TutorAddressManagementProps> = ({
  onBack,
  isStandalone = false,
}) => {
  const { currentUser, setUser, checkAuth } = useAuthStore();
  const toast = useToast();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<UserAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Fetch addresses on mount
  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      setAddresses(res.data || []);
    } catch (err: any) {
      console.error('Erro ao buscar endereços:', err);
      toast.error('Não foi possível carregar seus endereços.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Sync auth store user with updated default address
  const syncUserWithDefault = (address: UserAddress | null) => {
    if (!currentUser) return;
    if (address) {
      setUser({
        ...currentUser,
        address: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      } as any);
    } else {
      setUser({
        ...currentUser,
        address: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
      } as any);
    }
  };

  // Open modal for new address
  const handleOpenNewModal = () => {
    setEditingAddress(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      isDefault: addresses.length === 0, // Auto-check if first address
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (addr: UserAddress) => {
    setEditingAddress(addr);
    const isStandardLabel = ['Casa', 'Trabalho'].includes(addr.label);
    setFormData({
      label: isStandardLabel ? addr.label : 'Outro',
      customLabel: isStandardLabel ? '' : addr.label,
      street: addr.street || '',
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood || '',
      city: addr.city || 'Ourinhos',
      state: addr.state || 'SP',
      zipCode: addr.zipCode || '',
      isDefault: addr.isDefault,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Format and Lookup CEP via ViaCEP
  const handleCepChange = async (value: string) => {
    let clean = value.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 5) {
      formatted = `${clean.slice(0, 5)}-${clean.slice(5)}`;
    }

    setFormData((prev) => ({ ...prev, zipCode: formatted }));

    // Reset error when user edits
    if (errors.zipCode) {
      setErrors((prev) => ({ ...prev, zipCode: '' }));
    }

    if (clean.length === 8) {
      const prefix = parseInt(clean.slice(0, 5), 10);
      if (prefix < 19900 || prefix > 19919) {
        setErrors((prev) => ({
          ...prev,
          zipCode: 'Entregas apenas em Ourinhos - SP (CEP 19900-000 a 19919-999)',
        }));
        return;
      }

      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await response.json();
        if (data.erro) {
          setErrors((prev) => ({ ...prev, zipCode: 'CEP não encontrado.' }));
          return;
        }

        if (
          data.localidade?.trim().toLowerCase() !== 'ourinhos' ||
          data.uf?.trim().toUpperCase() !== 'SP'
        ) {
          setErrors((prev) => ({
            ...prev,
            zipCode: 'O PetHub realiza entregas apenas em Ourinhos - SP.',
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: 'Ourinhos',
          state: 'SP',
        }));

        setErrors({});
      } catch {
        toast.error('Erro ao consultar CEP. Preencha o endereço manualmente.');
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  // Validate form fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const cleanCep = formData.zipCode.replace(/\D/g, '');
    if (!cleanCep || cleanCep.length !== 8) {
      newErrors.zipCode = 'Informe um CEP válido com 8 dígitos';
    } else {
      const prefix = parseInt(cleanCep.slice(0, 5), 10);
      if (prefix < 19900 || prefix > 19919) {
        newErrors.zipCode = 'Entregas exclusivas para Ourinhos - SP (19900-000 a 19919-999)';
      }
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Rua / Logradouro é obrigatório';
    }
    if (!formData.number.trim()) {
      newErrors.number = 'Número é obrigatório';
    }
    if (!formData.neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro é obrigatório';
    }

    if (formData.label === 'Outro' && !formData.customLabel.trim()) {
      newErrors.customLabel = 'Identifique o local (ex: Casa de Praia, Sítio)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save address (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const resolvedLabel =
        formData.label === 'Outro'
          ? formData.customLabel.trim() || 'Outro'
          : formData.label;

      const payload = {
        label: resolvedLabel,
        street: formData.street.trim(),
        number: formData.number.trim(),
        complement: formData.complement.trim() || undefined,
        neighborhood: formData.neighborhood.trim(),
        city: 'Ourinhos',
        state: 'SP',
        zipCode: formData.zipCode.trim(),
        isDefault: addresses.length === 0 ? true : formData.isDefault,
      };

      if (editingAddress) {
        const res = await api.put(`/users/me/addresses/${editingAddress.id}`, payload);
        const updated = res.data.address;

        setAddresses((prev) =>
          prev.map((addr) => {
            if (addr.id === updated.id) return updated;
            if (updated.isDefault) return { ...addr, isDefault: false };
            return addr;
          })
        );

        if (updated.isDefault) {
          syncUserWithDefault(updated);
        }
        toast.success('Endereço atualizado com sucesso!');
      } else {
        const res = await api.post('/users/me/addresses', payload);
        const created = res.data.address;

        setAddresses((prev) => {
          if (created.isDefault) {
            return [created, ...prev.map((a) => ({ ...a, isDefault: false }))];
          }
          return [...prev, created];
        });

        if (created.isDefault) {
          syncUserWithDefault(created);
        }
        toast.success('Endereço adicionado com sucesso!');
      }

      setIsModalOpen(false);
      checkAuth();
    } catch (err: any) {
      console.error('Erro ao salvar endereço:', err);
      toast.error(err.response?.data?.error || 'Erro ao salvar endereço.');
    } finally {
      setIsSaving(false);
    }
  };

  // Set as primary/default address
  const handleSetDefault = async (addr: UserAddress) => {
    if (addr.isDefault) return;
    setSettingDefaultId(addr.id);
    try {
      const res = await api.patch(`/users/me/addresses/${addr.id}/default`, {});
      const updated = res.data.address;

      setAddresses((prev) =>
        prev
          .map((a) => ({
            ...a,
            isDefault: a.id === updated.id,
          }))
          .sort((a, b) => (b.id === updated.id ? 1 : 0) - (a.id === updated.id ? 1 : 0))
      );

      syncUserWithDefault(updated);
      toast.success(`"${updated.label}" agora é seu endereço principal.`);
      checkAuth();
    } catch (err: any) {
      console.error('Erro ao definir endereço padrão:', err);
      toast.error(err.response?.data?.error || 'Erro ao definir endereço principal.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Prompt delete confirmation
  const handlePromptDelete = (addr: UserAddress) => {
    setAddressToDelete(addr);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/me/addresses/${addressToDelete.id}`);

      const remaining = addresses.filter((a) => a.id !== addressToDelete.id);

      // If deleted address was default and remaining exist, the backend auto-promoted one
      if (addressToDelete.isDefault && remaining.length > 0) {
        const freshListRes = await api.get<UserAddress[]>('/users/me/addresses');
        setAddresses(freshListRes.data || []);
        const newDefault = freshListRes.data.find((a) => a.isDefault);
        syncUserWithDefault(newDefault || null);
      } else {
        setAddresses(remaining);
        if (remaining.length === 0) {
          syncUserWithDefault(null);
        }
      }

      toast.success('Endereço removido com sucesso.');
      setIsDeleteModalOpen(false);
      setAddressToDelete(null);
      checkAuth();
    } catch (err: any) {
      console.error('Erro ao excluir endereço:', err);
      toast.error(err.response?.data?.error || 'Erro ao excluir endereço.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('casa')) return <Home size={16} />;
    if (l.includes('trabalho') || l.includes('escritório') || l.includes('trampo'))
      return <Briefcase size={16} />;
    if (l.includes('apartamento') || l.includes('apto') || l.includes('condomínio'))
      return <Building size={16} />;
    return <MapPin size={16} />;
  };

  return (
    <div className="w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Voltar para o perfil"
              className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
              <MapPin className="text-orange-500" size={24} />
              Meus Endereços
            </h1>
            <p className="text-sm text-neutral-500 dark:text-[#8E918F] mt-0.5">
              Gerencie seus locais de entrega para pedidos e atendimentos em domicílio
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenNewModal}
          leftIcon={<Plus size={18} />}
          className="shrink-0 font-semibold shadow-md shadow-orange-500/10"
        >
          Novo Endereço
        </Button>
      </div>

      {/* City restriction notice banner */}
      <div className="mb-6 p-3.5 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 rounded-2xl flex items-start gap-3 text-xs text-orange-900 dark:text-orange-300">
        <Info size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-orange-950 dark:text-orange-200">
            Área de Cobertura PetHub: Ourinhos - SP
          </span>
          <p className="mt-0.5 text-orange-800 dark:text-orange-300/90 leading-relaxed">
            Nossos estabelecimentos parceiros e serviços de entrega atendem exclusivamente a
            cidade de Ourinhos - SP (faixa de CEP 19900-000 a 19919-999).
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-2xl p-5 animate-pulse flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
                <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
              <div className="h-3 w-1/2 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-100 dark:border-[#313335] p-8 md:p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
            <MapPin size={32} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">
            Nenhum endereço cadastrado
          </h3>
          <p className="text-sm text-neutral-500 dark:text-[#8E918F] max-w-md mx-auto mb-6">
            Cadastre um endereço para agilizar suas compras na loja e solicitar serviços com busca ou
            entrega em casa.
          </p>
          <Button
            onClick={handleOpenNewModal}
            leftIcon={<Plus size={18} />}
            className="font-semibold"
          >
            Cadastrar meu primeiro endereço
          </Button>
        </motion.div>
      ) : (
        /* Address List */
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {addresses.map((addr) => {
              const isDefault = addr.isDefault;
              const isSetting = settingDefaultId === addr.id;

              return (
                <motion.div
                  key={addr.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={[
                    'bg-white dark:bg-[#1E1F20] rounded-2xl p-5 border transition-all duration-200 relative group shadow-xs',
                    isDefault
                      ? 'border-orange-500 dark:border-orange-500/80 shadow-orange-500/5 ring-1 ring-orange-500/30'
                      : 'border-neutral-200/80 dark:border-[#313335] hover:border-neutral-300 dark:hover:border-neutral-700',
                  ].join(' ')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Address Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5]">
                          {getLabelIcon(addr.label)}
                          {addr.label}
                        </span>

                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40">
                            <Star size={12} className="fill-orange-500 text-orange-500" />
                            Principal
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base leading-snug">
                        {addr.street}, {addr.number}
                        {addr.complement && (
                          <span className="text-neutral-500 dark:text-[#8E918F] font-normal text-sm ml-2">
                            ({addr.complement})
                          </span>
                        )}
                      </h3>

                      <p className="text-sm text-neutral-600 dark:text-[#8E918F] mt-1">
                        {addr.neighborhood} — {addr.city} - {addr.state}
                      </p>

                      <p className="text-xs text-neutral-400 dark:text-[#8E918F] font-mono mt-0.5">
                        CEP: {addr.zipCode}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center sm:self-start gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-[#313335]">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr)}
                          disabled={isSetting}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Tornar este endereço padrão para entregas"
                        >
                          {isSetting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          Definir como principal
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(addr)}
                        className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-[#E3E3E3] hover:bg-neutral-100 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                        title="Editar endereço"
                        aria-label="Editar endereço"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePromptDelete(addr)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Excluir endereço"
                        aria-label="Excluir endereço"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Add / Edit Address */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingAddress ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}
        description="Preencha os dados do endereço para entrega e atendimento em Ourinhos - SP"
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Label selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-2">
              Tipo de Endereço
            </label>
            <div className="flex flex-wrap gap-2">
              {['Casa', 'Trabalho', 'Outro'].map((item) => {
                const isSelected = formData.label === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormData({ ...formData, label: item })}
                    className={[
                      'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                      isSelected
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                        : 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-200 dark:hover:bg-[#313335]',
                    ].join(' ')}
                  >
                    {item === 'Casa' && <Home size={14} />}
                    {item === 'Trabalho' && <Briefcase size={14} />}
                    {item === 'Outro' && <MapPin size={14} />}
                    {item}
                  </button>
                );
              })}
            </div>

            {formData.label === 'Outro' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2.5"
              >
                <input
                  type="text"
                  placeholder="Nome do local (ex: Casa da Mãe, Escritório, Sítio)"
                  value={formData.customLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, customLabel: e.target.value })
                  }
                  className={[
                    'w-full bg-neutral-50 dark:bg-[#282A2C] border rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] outline-none transition-all',
                    errors.customLabel
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-[#313335] focus:border-orange-500',
                  ].join(' ')}
                />
                {errors.customLabel && (
                  <p className="text-xs text-red-500 mt-1">{errors.customLabel}</p>
                )}
              </motion.div>
            )}
          </div>

          {/* CEP Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
              CEP <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={9}
                placeholder="19900-000"
                value={formData.zipCode}
                onChange={(e) => handleCepChange(e.target.value)}
                className={[
                  'w-full bg-neutral-50 dark:bg-[#282A2C] border rounded-xl px-4 py-2.5 text-sm font-mono text-neutral-900 dark:text-[#E3E3E3] outline-none transition-all',
                  errors.zipCode
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-neutral-200 dark:border-[#313335] focus:border-orange-500',
                ].join(' ')}
              />
              {isCepLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-orange-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Buscando...</span>
                </div>
              )}
            </div>
            {errors.zipCode ? (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.zipCode}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
                Ao digitar os 8 dígitos do CEP de Ourinhos, os dados de rua e bairro serão
                preenchidos automaticamente.
              </p>
            )}
          </div>

          {/* Street & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                Rua / Logradouro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Rua Nove de Julho"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className={[
                  'w-full bg-neutral-50 dark:bg-[#282A2C] border rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] outline-none transition-all',
                  errors.street
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-[#313335] focus:border-orange-500',
                ].join(' ')}
              />
              {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                Número <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 450"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className={[
                  'w-full bg-neutral-50 dark:bg-[#282A2C] border rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] outline-none transition-all',
                  errors.number
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-[#313335] focus:border-orange-500',
                ].join(' ')}
              />
              {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
            </div>
          </div>

          {/* Complement & Neighborhood */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                Complemento / Referência{' '}
                <span className="text-neutral-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Apto 102, Bloco B, Fundos"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                Bairro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Vila Margarida"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className={[
                  'w-full bg-neutral-50 dark:bg-[#282A2C] border rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] outline-none transition-all',
                  errors.neighborhood
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-[#313335] focus:border-orange-500',
                ].join(' ')}
              />
              {errors.neighborhood && (
                <p className="text-xs text-red-500 mt-1">{errors.neighborhood}</p>
              )}
            </div>
          </div>

          {/* City and State (Locked to Ourinhos - SP) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                Cidade
              </label>
              <input
                type="text"
                value="Ourinhos"
                readOnly
                disabled
                className="w-full bg-neutral-100 dark:bg-[#282A2C]/60 border border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#8E918F] rounded-xl px-4 py-2.5 text-sm cursor-not-allowed select-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase tracking-wider mb-1.5">
                UF
              </label>
              <input
                type="text"
                value="SP"
                readOnly
                disabled
                className="w-full bg-neutral-100 dark:bg-[#282A2C]/60 border border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#8E918F] rounded-xl px-4 py-2.5 text-sm cursor-not-allowed select-none font-medium text-center"
              />
            </div>
          </div>

          {/* Default Address Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-[#282A2C]/30 cursor-pointer">
              <input
                type="checkbox"
                checked={addresses.length === 0 ? true : formData.isDefault}
                disabled={addresses.length === 0}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="mt-0.5 rounded text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  Tornar este meu endereço principal
                </span>
                <p className="text-neutral-500 dark:text-[#8E918F] mt-0.5">
                  Será selecionado automaticamente como endereço de entrega e agendamento padrão.
                </p>
              </div>
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving} className="font-semibold px-6">
              {editingAddress ? 'Salvar Alterações' : 'Cadastrar Endereço'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Endereço"
        message={
          addressToDelete
            ? `Tem certeza que deseja excluir o endereço "${addressToDelete.label} - ${addressToDelete.street}, ${addressToDelete.number}"? Esta ação não poderá ser desfeita.`
            : 'Tem certeza que deseja excluir este endereço?'
        }
        description={
          addressToDelete?.isDefault && addresses.length > 1
            ? 'Atenção: Este é seu endereço principal. Ao excluí-lo, outro endereço será promovido automaticamente a principal.'
            : undefined
        }
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
