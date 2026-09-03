import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Camera, Check, Clock } from 'lucide-react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/users/me/profile', {
        name,
        phone,
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
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload/image', formData);

      if (res.data?.url) {
        const fullUrl = res.data.url.startsWith('http') ? res.data.url : `http://localhost:3000${res.data.url}`;
        
        await api.put('/users/me/profile', {
          avatar: fullUrl,
        });

        if (setUser && currentUser) {
          setUser({
            ...currentUser,
            avatar: fullUrl,
          });
        }
        toast.success('Foto de perfil profissional atualizada!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Meu Perfil Profissional</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Mantenha seus dados cadastrais, conselho de classe e especialidades sempre atualizados</p>
      </div>

      {/* Profile Photo Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <Avatar
            src={currentUser?.avatar}
            name={currentUser?.name || ''}
            size="2xl"
            fallbackSrc="/user.jpg"
            entityType="professional"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="absolute bottom-0 right-0 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-md transition-all cursor-pointer"
            title="Alterar foto"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        <div className="text-center sm:text-left space-y-1">
          <h2 className="font-bold text-lg text-neutral-900">{currentUser?.name}</h2>
          <p className="text-xs font-semibold text-orange-600">{specialty}</p>
          <p className="text-xs text-neutral-400 font-mono">Registro: {document || 'Pendente de validação'}</p>
          <p className="text-[11px] text-neutral-500 pt-1">Formatos suportados: JPG, PNG até 5MB</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Nome Completo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Nome Completo"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">E-mail Cadastrado</label>
            <Input
              value={currentUser?.email || ''}
              disabled
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Telefone / WhatsApp</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(14) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Registro / CRMV</label>
            <Input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="CRMV-SP 12345"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Especialidade Principal</label>
          <Input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex: Cirurgia Veterinária, Oftalmologia, Acupuntura..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Apresentação & Biografia</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Descreva sua formação, anos de prática clínica e abordagem no cuidado animal..."
            className="w-full border border-neutral-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-100">
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
