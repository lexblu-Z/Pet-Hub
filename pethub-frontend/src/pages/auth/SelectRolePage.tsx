import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PawPrint, Check, ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button, Input } from '@/components/ui';
import type { UserRole } from '@/types';

type RoleOption = 'TUTOR' | 'ESTABLISHMENT' | 'PROFESSIONAL';

interface RoleCard {
  role: RoleOption;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
}

const roleOptions: RoleCard[] = [
  {
    role: 'TUTOR',
    emoji: '🐶',
    title: 'Tutor de Pets',
    subtitle: 'Para pais e mães de pet',
    description: 'Cadastre seus pets, agende banhos, tosas, consultas e vacinas, e compre produtos com cashback.',
    features: ['Carteira de vacinação digital', 'Agendamento rápido online', 'Histórico completo de saúde'],
  },
  {
    role: 'ESTABLISHMENT',
    emoji: '🏢',
    title: 'Estabelecimento',
    subtitle: 'Pet shop, clínica ou banho & tosa',
    description: 'Divulgue sua empresa para milhares de tutores de Ourinhos, receba agendamentos e venda produtos.',
    features: ['Gestão de serviços e produtos', 'Painel financeiro e pedidos', 'Sincronização com Google Calendar'],
  },
  {
    role: 'PROFESSIONAL',
    emoji: '👨‍⚕️',
    title: 'Profissional Autônomo',
    subtitle: 'Veterinário, tosador ou adestrador',
    description: 'Gerencie sua agenda de atendimentos, receba confirmações em tempo real e atenda com flexibilidade.',
    features: ['Agenda integrada e flexível', 'Prontuários e fichas de pacientes', 'Sincronização com Google Calendar'],
  },
];

export default function SelectRolePage() {
  const [searchParams] = useSearchParams();
  const regToken = searchParams.get('regToken') || '';
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const avatar = searchParams.get('avatar') || '';

  const [selectedRole, setSelectedRole] = useState<RoleOption>('TUTOR');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const toast = useToast();

  const handleComplete = async () => {
    if (!regToken) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/auth/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/google/complete', {
        regToken,
        role: selectedRole,
        phone: phone.trim() || undefined,
      });

      const { token, user } = response.data;

      const roleRouteMap: Record<string, string> = {
        TUTOR: 'tutor',
        ESTABLISHMENT: 'estabelecimento',
        PROFESSIONAL: 'profissional',
        ADMIN: 'admin',
      };

      const frontRole = (roleRouteMap[user.role] || user.role.toLowerCase()) as UserRole;
      login(token, user, frontRole);

      toast.success('Cadastro concluído com sucesso! Bem-vindo ao PetHub! 🎉');

      if (user.role === 'TUTOR') {
        navigate('/auth/onboarding');
      } else if (user.role === 'ESTABLISHMENT') {
        navigate('/estabelecimento');
      } else if (user.role === 'PROFESSIONAL') {
        navigate('/profissional');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Registration completion error:', err);
      const msg = err.response?.data?.error || 'Erro ao finalizar cadastro. Tente novamente.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 sm:p-10 space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xs">
              <PawPrint size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          {/* User profile pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-neutral-100/80 rounded-full border border-neutral-200/60">
            {avatar ? (
              <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold text-neutral-800 leading-none">{name || 'Usuário Google'}</p>
              <p className="text-[10px] text-neutral-400 leading-none mt-0.5">{email}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
            Como você deseja utilizar o PetHub?
          </h1>
          <p className="text-sm text-neutral-500">
            Selecione o perfil que melhor descreve sua atuação na plataforma:
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 gap-4">
          {roleOptions.map((card) => {
            const isSelected = selectedRole === card.role;
            return (
              <div
                key={card.role}
                onClick={() => setSelectedRole(card.role)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl sm:text-4xl shrink-0 p-2 bg-neutral-100 rounded-2xl">{card.emoji}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 text-base">{card.title}</h3>
                      <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {card.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 max-w-md leading-relaxed">
                      {card.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {card.features.map((f, i) => (
                        <span key={i} className="text-[10px] text-neutral-600 bg-neutral-100/80 px-2 py-0.5 rounded-md font-medium">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Phone Input */}
        <div className="pt-2">
          <Input
            label="Telefone / WhatsApp (opcional)"
            placeholder="(14) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone size={16} />}
          />
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-500">
          <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Seus dados do Google são armazenados de forma segura e protegida. Você poderá conectar o <strong>Google Calendar</strong> a qualquer momento diretamente nas configurações da sua agenda.
          </p>
        </div>

        {/* Submit */}
        <Button
          fullWidth
          size="lg"
          onClick={handleComplete}
          isLoading={isSubmitting}
          rightIcon={<ArrowRight size={18} />}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
        >
          Concluir cadastro e entrar
        </Button>
      </motion.div>
    </div>
  );
}
