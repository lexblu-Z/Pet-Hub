import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Camera, Check, Clock, Trash2 } from 'lucide-react';
import { Button, Input, Card, Avatar } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

export default function ProfessionalProfilePage() {
  const { currentUser, setUser } = useAuthStore();
  const profProfile = (currentUser as any)?.professionalProfile;
  const toast = useToast();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [specialty, setSpecialty] = useState(profProfile?.specialty || 'Clínico Geral Veterinário');
  const [document, setDocument] = useState(profProfile?.document || '');
  const [bio, setBio] = useState(profProfile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/users/me/profile', {
        name,
        phone,
        specialty,
        bio,
        document,
      });

      if (setUser && currentUser) {
        setUser({
          ...currentUser,
          name,
          phone,
          professionalProfile: {
            ...profProfile,
            specialty,
            document,
            bio,
          },
        } as any);
      }

      toast.success('Perfil profissional atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validExtensions.includes(file.type)) {
      toast.error('Formato inválido. Formatos aceitos: JPG, JPEG, PNG e WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Tamanho máximo permitido: 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.url) {
        const fullUrl = res.data.url.startsWith('http') ? res.data.url : `http://localhost:3000${res.data.url}`;

        if (setUser && currentUser) {
          setUser({
            ...currentUser,
            avatar: fullUrl,
          });
        }
        // Limpar o blob URL local — a fonte de verdade agora é o authStore
        setPreviewUrl(null);
        toast.success('Foto de perfil profissional atualizada!');
      }
    } catch (err: any) {
      console.error(err);
      setPreviewUrl(null);
      toast.error(err.response?.data?.error || 'Erro ao enviar imagem.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Deseja realmente remover sua foto de perfil?')) return;
    setIsUploadingPhoto(true);
    try {
      await api.delete('/upload/avatar');
      if (setUser && currentUser) {
        setUser({
          ...currentUser,
          avatar: null,
        });
      }
      setPreviewUrl(null);
      toast.success('Foto de perfil removida com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao remover foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Meu Perfil Profissional</h1>
        <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">Mantenha seus dados cadastrais, conselho de classe e especialidades sempre atualizados</p>
      </div>

      {/* Profile Photo Card */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <Avatar
            src={previewUrl || currentUser?.avatar}
            name={currentUser?.name || ''}
            size="2xl"
            fallbackSrc={currentUser?.defaultAvatar || '/user5.jpg'}
            entityType="professional"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="absolute bottom-0 right-0 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Alterar foto"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        <div className="text-center sm:text-left space-y-1 flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-lg text-neutral-900 dark:text-[#E3E3E3]">{currentUser?.name}</h2>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{specialty}</p>
            </div>
            {currentUser?.avatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isUploadingPhoto}
                className="self-center sm:self-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Remover foto</span>
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-400 dark:text-[#8E918F] font-mono">Registro: {document || 'Pendente de validação'}</p>
          <p className="text-[11px] text-neutral-500 dark:text-[#8E918F] pt-1">Formatos aceitos: JPG, JPEG, PNG e WEBP (até 5MB)</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">Nome Completo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Nome Completo"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">E-mail Cadastrado</label>
            <Input
              value={currentUser?.email || ''}
              disabled
              className="bg-neutral-50 dark:bg-[#282A2C] text-neutral-500 dark:text-[#8E918F] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">Telefone / WhatsApp</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(14) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">Registro / CRMV</label>
            <Input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="CRMV-SP 12345"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">Especialidade Principal</label>
          <Input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex: Cirurgia Veterinária, Oftalmologia, Acupuntura..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">Apresentação & Biografia</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Descreva sua formação, anos de prática clínica e abordagem no cuidado animal..."
            className="w-full border border-neutral-300 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-[#313335]">
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            isLoading={isSaving}
          >
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
