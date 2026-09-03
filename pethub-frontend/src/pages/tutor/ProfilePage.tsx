import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ShoppingBag, Mail, Phone, MapPin, Shield, CreditCard, LogOut, Settings, Bell, ChevronRight, Edit3, ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui';
import type { TutorProfile } from '@/types';

export default function ProfilePage() {
  const { currentUser, logout } = useAuthStore();
  const user = currentUser as TutorProfile;
  const navigate = useNavigate();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fallbackAvatar = user?.role === 'tutor' ? '/user.jpg' : '';
  const userAvatar = user?.avatar || fallbackAvatar;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: '123.456.789-00', // Mock CPF
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
      useAuthStore.getState().setUser({ ...user, avatar: res.data.url } as any);
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

  const handleSave = () => {
    toast.success('Dados atualizados com sucesso!');
    setIsEditing(false);
  };

  const menuSections = [
    {
      title: 'Minha Conta',
      items: [
        { id: 'personal', icon: <User size={18} />, label: 'Dados pessoais', desc: 'Nome, CPF, data de nascimento' },
        { id: 'purchases', icon: <ShoppingBag size={18} />, label: 'Minhas compras', desc: 'Histórico de pedidos e recomprar', to: '/tutor/compras' },
        { id: 'address', icon: <MapPin size={18} />, label: 'Endereços', desc: 'Gerenciar endereços de entrega e busca' },
        { id: 'payment', icon: <CreditCard size={18} />, label: 'Formas de pagamento', desc: 'Cartões e PIX salvos', to: '/tutor/pagamento' },
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
        {!isEditing ? (
          <motion.div key="view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {/* Header / Profile Card */}
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden mb-8 shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full translate-y-16 -translate-x-16 blur-2xl" />
              
              <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative">
                    <img
                      src={previewUrl || userAvatar}
                      alt={user?.name}
                      onClick={() => fileInputRef.current?.click()}
                      onError={(e) => { e.currentTarget.src = fallbackAvatar; }}
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
                  <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 px-2">{section.title}</h2>
                  <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { if (item.to) { navigate(item.to); } else if (item.id === 'personal') { setIsEditing(true); } }}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 group"
                      >
                        <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-600 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900">{item.label}</p>
                          <p className="text-xs text-neutral-500">{item.desc}</p>
                        </div>
                        <ChevronRight size={18} className="text-neutral-300 group-hover:text-orange-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors"
                >
                  <LogOut size={18} />
                  Sair da conta
                </button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-neutral-900">Editar Dados Pessoais</h1>
            </div>

            <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm space-y-5">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900">Dados de Identificação Protegidos</span>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    O Nome Completo e o CPF são dados de identificação e não podem ser alterados diretamente. Encontrou algum erro nos seus dados? Entre em contato com o suporte.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5 flex items-center justify-between">
                  <span>Nome Completo</span>
                  <span className="text-xs text-neutral-400 font-normal flex items-center gap-1">
                    <Lock size={12} /> Somente leitura
                  </span>
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  readOnly
                  disabled
                  className="w-full bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-xl px-4 py-3 cursor-not-allowed font-medium select-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5 flex items-center justify-between">
                  <span>CPF</span>
                  <span className="text-xs text-neutral-400 font-normal flex items-center gap-1">
                    <Lock size={12} /> Somente leitura
                  </span>
                </label>
                <input 
                  type="text" 
                  value={formData.cpf || 'Não informado'}
                  readOnly
                  disabled
                  className="w-full bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-xl px-4 py-3 cursor-not-allowed font-medium select-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Telefone / WhatsApp <span className="text-neutral-400 font-normal">(Opcional)</span>
                </label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button fullWidth leftIcon={<Save size={18} />} onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
