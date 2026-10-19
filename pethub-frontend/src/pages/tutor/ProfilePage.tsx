import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ShoppingBag, Mail, Phone, MapPin, Shield, CreditCard, LogOut, Settings, Bell, ChevronRight, Edit3, ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui';
import { getStableAvatar } from '@/components/ui/Card';
import { formatPhone } from '@/utils/phone';
import { formatCPF } from '@/utils/documentValidation';
import { EasterEggUnlockModal } from '@/components/shared/EasterEggUnlockModal';
import { TutorAddressManagement } from '@/components/tutor/TutorAddressManagement';
import type { TutorProfile } from '@/types';

interface ProfilePageProps {
  initialTab?: 'menu' | 'personal' | 'addresses';
}

export default function ProfilePage({ initialTab }: ProfilePageProps = {}) {
  const { currentUser, logout, setUser } = useAuthStore();
  const user = currentUser as TutorProfile;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  
  const tabQuery = searchParams.get('tab');
  const [viewMode, setViewMode] = useState<'menu' | 'personal' | 'addresses'>(() => {
    if (initialTab) return initialTab;
    if (tabQuery === 'enderecos' || tabQuery === 'addresses' || tabQuery === 'endereco') return 'addresses';
    if (tabQuery === 'dados-pessoais' || tabQuery === 'personal') return 'personal';
    return 'menu';
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fallbackAvatar = user?.defaultAvatar || getStableAvatar(user?.name || user?.email || 'tutor') || '/user.jpg';
  const userAvatar = user?.avatar || fallbackAvatar;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: (user as any)?.document ? formatCPF((user as any).document) : '',
  });

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Você saiu da sua conta');
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fullUrl = res.data.url.startsWith('http') ? res.data.url : `http://localhost:3000${res.data.url}`;
      useAuthStore.getState().setUser({ ...user, avatar: fullUrl } as any);
      setPreviewUrl(null);
      setSelectedFile(null);
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error('Não foi possível atualizar sua foto. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelUpload = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      await api.delete('/upload/avatar');
      useAuthStore.getState().setUser({ ...user, avatar: null } as any);
      setPreviewUrl(null);
      toast.success('Foto removida!');
    } catch (err) {
      toast.error('Erro ao remover foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put('/users/me/profile', {
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });
      if (res.data?.user) {
        setUser({ ...(currentUser as any), ...res.data.user });
      }
      toast.success('Dados atualizados com sucesso!');
      setViewMode('menu');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const menuSections = [
    {
      title: 'Minha Conta',
      items: [
        { id: 'personal', icon: <User size={18} />, label: 'Dados pessoais', desc: 'Nome, CPF, data de nascimento' },
        { id: 'purchases', icon: <ShoppingBag size={18} />, label: 'Minhas compras', desc: 'Histórico de pedidos e recomprar', to: '/tutor/compras' },
        { id: 'address', icon: <MapPin size={18} />, label: 'Endereços', desc: 'Gerenciar endereços de entrega e busca' },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { id: 'notif', icon: <Bell size={18} />, label: 'Notificações', desc: 'Preferências de alertas e e-mails', to: '/tutor/notificacoes-config' },
        { id: 'security', icon: <Shield size={18} />, label: 'Segurança', desc: 'Senha e autenticação', to: '/tutor/seguranca' },
        { id: 'prefs', icon: <Settings size={18} />, label: 'Preferências do App', desc: 'Tema, idioma, etc.', to: '/tutor/preferencias' },
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <AnimatePresence mode="wait">
        {viewMode === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {/* Header / Profile Card */}
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden mb-8 shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full translate-y-16 -translate-x-16 blur-2xl" />
              
              <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative">
                    <img
                      src={previewUrl || userAvatar}
                      alt={user?.name || 'Foto de perfil'}
                      onClick={() => fileInputRef.current?.click()}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackAvatar || '/user.jpg';
                      }}
                      className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-lg cursor-pointer hover:opacity-85 transition-opacity"
                    />
                    
                    <input type="file" accept="image/png,image/jpeg,image/webp" ref={fileInputRef} onChange={handleUploadPhoto} className="hidden" />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center border-2 border-neutral-900 transition-colors shadow-sm z-10 group"
                      title="Alterar foto"
                    >
                      <Edit3 size={14} className="text-white" />
                      <span className="absolute right-10 whitespace-nowrap bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Alterar foto</span>
                    </button>
                    
                    {user?.avatar && !previewUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        disabled={isUploading}
                        className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center border-2 border-neutral-900 transition-colors shadow-sm z-10 group"
                        title="Remover foto"
                      >
                        <span className="text-white text-xs font-bold leading-none">×</span>
                        <span className="absolute left-8 whitespace-nowrap bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Remover</span>
                      </button>
                    )}
                  </div>

                  {previewUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex flex-col gap-1.5 w-full min-w-[130px]"
                    >
                      <Button size="sm" onClick={confirmUpload} isLoading={isUploading} className="w-full text-xs font-semibold py-1.5">
                        Salvar foto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelUpload} disabled={isUploading} className="w-full text-xs py-1 text-white/70 hover:text-white">
                        Cancelar
                      </Button>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
                  <p className="text-white/60 text-sm mb-4">Membro desde {new Date(user?.createdAt || Date.now()).getFullYear()}</p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
                      <Mail size={14} className="text-white/60" />
                      <span>{user?.email}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
                        <Phone size={14} className="text-white/60" />
                        <span>{user?.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Sections */}
            <div className="space-y-6">
              {menuSections.map((section, i) => (
                <motion.div 
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <h2 className="text-sm font-bold text-neutral-400 dark:text-[#8E918F] uppercase tracking-wider mb-3 px-2">{section.title}</h2>
                  <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden shadow-sm">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.to) {
                            navigate(item.to);
                          } else if (item.id === 'personal') {
                            setViewMode('personal');
                          } else if (item.id === 'address') {
                            setViewMode('addresses');
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors border-b border-neutral-100 dark:border-[#313335] last:border-0 group cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-neutral-100 dark:bg-[#282A2C] rounded-xl flex items-center justify-center text-neutral-600 dark:text-[#C4C7C5] group-hover:bg-orange-50 dark:group-hover:bg-orange-950/40 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3]">{item.label}</p>
                          <p className="text-xs text-neutral-500 dark:text-[#8E918F]">{item.desc}</p>
                        </div>
                        <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600 group-hover:text-orange-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Easter Egg Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="pt-2"
              >
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden shadow-xs hover:shadow-md transition-all">
                  <button
                    onClick={() => setShowEasterEggModal(true)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors group cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-[#282A2C] rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:scale-110 transition-transform">
                      <Lock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3] group-hover:text-orange-500 transition-colors">
                        Recursos Experimentais
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-[#8E918F]">
                        Área de desenvolvimento e recursos especiais
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                >
                  <LogOut size={18} />
                  Sair da conta
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {viewMode === 'personal' && (
          <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setViewMode('menu')} className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-full transition-colors text-neutral-800 dark:text-[#E3E3E3] cursor-pointer">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Editar Dados Pessoais</h1>
            </div>

            <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-100 dark:border-[#313335] p-6 shadow-sm space-y-5">
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Shield size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">Dados de Identificação Protegidos</span>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-400 leading-relaxed">
                    O Nome Completo e o CPF são dados de identificação e não podem ser alterados diretamente. Encontrou algum erro nos seus dados? Entre em contato com o suporte.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1.5 flex items-center justify-between">
                  <span>Nome Completo</span>
                  <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-normal flex items-center gap-1">
                    <Lock size={12} /> Somente leitura
                  </span>
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  readOnly
                  disabled
                  className="w-full bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#8E918F] rounded-xl px-4 py-3 cursor-not-allowed font-medium select-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1.5 flex items-center justify-between">
                  <span>CPF</span>
                  <span className="text-xs text-neutral-400 dark:text-[#8E918F] font-normal flex items-center gap-1">
                    <Lock size={12} /> Somente leitura
                  </span>
                </label>
                <input 
                  type="text" 
                  value={formData.cpf || 'Não informado'}
                  readOnly
                  disabled
                  className="w-full bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#8E918F] rounded-xl px-4 py-3 cursor-not-allowed font-medium select-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                  Telefone / WhatsApp *
                </label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                  className="w-full bg-neutral-50 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  placeholder="(14) 99999-9999"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setViewMode('menu')}>
                  Cancelar
                </Button>
                <Button fullWidth leftIcon={<Save size={18} />} onClick={handleSave} isLoading={isSaving}>
                  Salvar
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'addresses' && (
          <motion.div key="addresses" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TutorAddressManagement onBack={() => setViewMode('menu')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter Egg Unlock Challenge Modal */}
      <EasterEggUnlockModal
        isOpen={showEasterEggModal}
        onClose={() => setShowEasterEggModal(false)}
      />
    </div>
  );
}
