import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PawPrint,
  Check,
  ArrowRight,
  ArrowLeft,
  Phone,
  ShieldCheck,
  User,
  Building2,
  Stethoscope,
  Camera,
  Trash2,
  Search,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button, Input } from '@/components/ui';
import { formatCPF, formatDocumentAuto, validateCPF, validateDocument } from '@/utils/documentValidation';
import { formatPhone, validatePhone } from '@/utils/phone';
import type { UserRole } from '@/types';

type RoleOption = 'TUTOR' | 'ESTABLISHMENT' | 'PROFESSIONAL';

interface RoleCard {
  role: RoleOption;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
}

const roleOptions: RoleCard[] = [
  {
    role: 'TUTOR',
    icon: PawPrint,
    title: 'Tutor de Pets',
    subtitle: 'Para pais e mães de pet',
    description: 'Cadastre seus pets, agende banhos, tosas, consultas e vacinas, e compre produtos com cashback.',
    features: ['Carteira de vacinação digital', 'Agendamento rápido online', 'Histórico completo de saúde'],
  },
  {
    role: 'ESTABLISHMENT',
    icon: Building2,
    title: 'Estabelecimento',
    subtitle: 'Pet shop, clínica ou banho & tosa',
    description: 'Divulgue sua empresa para milhares de tutores de Ourinhos, receba agendamentos e venda produtos.',
    features: ['Gestão de serviços e produtos', 'Painel financeiro e pedidos', 'Sincronização com Google Calendar'],
  },
  {
    role: 'PROFESSIONAL',
    icon: Stethoscope,
    title: 'Profissional Autônomo',
    subtitle: 'Veterinário, tosador ou adestrador',
    description: 'Gerencie sua agenda de atendimentos, receba confirmações em tempo real e atenda com flexibilidade.',
    features: ['Agenda integrada e flexível', 'Prontuários e fichas de pacientes', 'Sincronização com Google Calendar'],
  },
];

const establishmentTypes = [
  'Pet shop',
  'Clínica veterinária',
  'Hospital veterinário',
  'Banho e tosa',
  'Hotel para pets',
  'Creche / Daycare',
  'Adestramento',
  'Outro',
];

const professionalSpecialties = [
  'Veterinário Geral',
  'Cirurgião Veterinário',
  'Dermatologia Veterinária',
  'Tosador / Esteticista Animal',
  'Banhista',
  'Adestrador Comportamental',
  'Passeador / Dog Walker',
  'Fisioterapeuta Veterinário',
  'Outro',
];

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

export default function SelectRolePage() {
  const [searchParams] = useSearchParams();
  const regToken = searchParams.get('regToken') || '';
  const initialName = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const avatar = searchParams.get('avatar') || '';
  const source = searchParams.get('source') || (avatar ? 'google' : 'otp');

  // Multi-stage flow:
  // stage 2: Escolha de tipo de conta (SEM telefone)
  // stage 3: Dados do perfil / onboarding (Telefone OBRIGATÓRIO)
  // stage 4: Finalização da conta
  const [stage, setStage] = useState<'role' | 'profile' | 'success'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleOption>('TUTOR');

  // Common Profile Data
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  // Establishment Specific Data
  const [businessName, setBusinessName] = useState(initialName || '');
  const [establishmentType, setEstablishmentType] = useState('Pet shop');
  const [estabDocument, setEstabDocument] = useState('');
  const [estabDescription, setEstabDescription] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('Ourinhos');
  const [state, setState] = useState('SP');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [establishmentPhotos, setEstablishmentPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Professional Specific Data
  const [profSpecialty, setProfSpecialty] = useState(professionalSpecialties[0]);
  const [profDocument, setProfDocument] = useState('');
  const [profBio, setProfBio] = useState('');

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const toast = useToast();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    if (phoneError) setPhoneError(null);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    setCep(formatted);
    setCityError(null);

    if (raw.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error('CEP não encontrado.');
          return;
        }

        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');

        if (data.localidade?.trim().toLowerCase() !== 'ourinhos' || data.uf?.trim().toUpperCase() !== 'SP') {
          setCityError('No momento, o PetHub está disponível apenas para estabelecimentos localizados em Ourinhos - SP.');
        } else {
          setCityError(null);
          toast.success('Endereço preenchido com sucesso!');
        }
      } catch (err) {
        toast.error('Erro ao consultar CEP.');
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await api.post('/upload/image', formData);
        if (res.data?.url) {
          setEstablishmentPhotos((prev) => [...prev, res.data.url]);
        }
      }
      toast.success('Foto adicionada com sucesso!');
    } catch (err) {
      toast.error('Erro ao fazer upload da foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEstablishmentPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinueToProfile = () => {
    // ETAPA 2 -> ETAPA 3: Apenas avança, sem exigir telefone na tela de tipo de conta!
    setStage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitProfile = async () => {
    if (!regToken) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/auth/login');
      return;
    }

    // Validação de nome
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Informe seu nome completo (mínimo de 2 caracteres).');
      return;
    }

    // Validação estrita de telefone obrigatório
    const phoneVal = validatePhone(phone);
    if (!phoneVal.isValid) {
      const errMsg = phoneVal.error || 'Digite um número de telefone válido.';
      setPhoneError(errMsg);
      toast.error(errMsg);
      return;
    }
    setPhoneError(null);

    // Validações específicas por perfil
    if (selectedRole === 'TUTOR') {
      if (!cep || !street || !number || !neighborhood) {
        toast.error('Preencha seu endereço residencial completo (CEP, Rua, Número e Bairro).');
        return;
      }
      if (city.trim().toLowerCase() !== 'ourinhos' || state.trim().toUpperCase() !== 'SP') {
        toast.error('O cadastro de tutor é permitido apenas para residentes em Ourinhos - SP.');
        return;
      }
      const cleanCep = cep.replace(/\D/g, '');
      const prefix = parseInt(cleanCep.slice(0, 5), 10);
      if (cleanCep.length !== 8 || prefix < 19900 || prefix > 19919) {
        toast.error('O CEP deve pertencer ao município de Ourinhos - SP.');
        return;
      }
    }

    if (selectedRole === 'ESTABLISHMENT') {
      if (!businessName.trim()) {
        toast.error('Informe o nome do estabelecimento.');
        return;
      }
      if (!estabDocument.trim()) {
        toast.error('Informe o CNPJ ou CPF do responsável.');
        return;
      }
      const estabDocVal = validateDocument(estabDocument, 'auto');
      if (!estabDocVal.isValid) {
        toast.error(estabDocVal.error || 'Informe um CNPJ ou CPF válido.');
        return;
      }
      if (!street || !number || !neighborhood) {
        toast.error('Preencha o endereço completo do estabelecimento.');
        return;
      }
      if (city.trim().toLowerCase() !== 'ourinhos' || state.trim().toUpperCase() !== 'SP') {
        toast.error('Cadastro permitido apenas para estabelecimentos em Ourinhos - SP.');
        return;
      }
      if (establishmentPhotos.length === 0) {
        toast.error('Adicione pelo menos 1 foto do estabelecimento para análise.');
        return;
      }
    }

    if (selectedRole === 'PROFESSIONAL') {
      if (!profDocument.trim()) {
        toast.error('Informe o CPF do profissional.');
        return;
      }
      const profDocVal = validateCPF(profDocument);
      if (!profDocVal.isValid) {
        toast.error(profDocVal.error || 'Informe um CPF válido para o profissional.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const fullAddress = [
        street,
        number ? `nº ${number}` : '',
        complement ? `(${complement})` : '',
        neighborhood ? `- ${neighborhood}` : '',
        city ? `${city}/${state}` : '',
      ].filter(Boolean).join(' ');

      const basePayload: any = {
        regToken,
        role: selectedRole,
        name: fullName.trim(),
        phone: phone.trim(),
      };

      if (selectedRole === 'TUTOR') {
        basePayload.address = street;
        basePayload.number = number;
        basePayload.complement = complement || undefined;
        basePayload.neighborhood = neighborhood;
        basePayload.city = city || 'Ourinhos';
        basePayload.state = state || 'SP';
        basePayload.zipCode = cep;
      } else if (selectedRole === 'ESTABLISHMENT') {
        basePayload.businessName = businessName.trim();
        basePayload.establishmentType = establishmentType;
        basePayload.document = estabDocument.trim();
        basePayload.address = fullAddress;
        basePayload.city = city || 'Ourinhos';
        basePayload.state = state || 'SP';
        basePayload.zipCode = cep || undefined;
        basePayload.description = estabDescription.trim() || undefined;
        basePayload.photos = establishmentPhotos;
      } else if (selectedRole === 'PROFESSIONAL') {
        basePayload.document = profDocument.trim();
        basePayload.specialty = profSpecialty;
        basePayload.bio = profBio.trim() || undefined;
      }

      const endpoint = source === 'otp' ? '/auth/otp/complete' : '/auth/google/complete';
      const response = await api.post(endpoint, basePayload);

      const { token, user } = response.data;

      const roleRouteMap: Record<string, string> = {
        TUTOR: 'tutor',
        ESTABLISHMENT: 'estabelecimento',
        PROFESSIONAL: 'profissional',
        ADMIN: 'admin',
      };

      const frontRole = (roleRouteMap[user.role] || user.role.toLowerCase()) as UserRole;
      login(token, user, frontRole);

      setCreatedUser(user);
      setStage('success');
      toast.success('Cadastro concluído com sucesso!');
    } catch (err: any) {
      console.error('Registration completion error:', err);
      const msg = err.response?.data?.error || 'Erro ao finalizar cadastro. Tente novamente.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#131314] flex items-center justify-center p-4 sm:p-6 lg:p-12 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] shadow-sm p-6 sm:p-10 space-y-8"
      >
        {/* Top Branding & User Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xs">
              <PawPrint size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-neutral-100/80 dark:bg-[#282A2C] rounded-full border border-neutral-200/60 dark:border-[#313335]">
            {avatar ? (
              <img src={avatar} alt={fullName || 'Avatar'} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                {fullName ? fullName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold text-neutral-800 dark:text-[#E3E3E3] leading-none">
                {fullName || (source === 'otp' ? 'Novo Usuário' : 'Usuário Google')}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-[#8E918F] leading-none mt-0.5">{email}</p>
            </div>
          </div>
        </div>

        {/* 4-Step Stepper Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 pb-2 border-b border-neutral-100 dark:border-[#313335]">
          <div className="text-center">
            <div className="h-1.5 rounded-full bg-green-500 mb-1.5" />
            <span className="text-[11px] font-bold text-green-700 dark:text-green-400">1. Método</span>
          </div>
          <div className="text-center">
            <div className={`h-1.5 rounded-full mb-1.5 ${stage === 'role' ? 'bg-orange-500' : 'bg-green-500'}`} />
            <span className={`text-[11px] font-bold ${stage === 'role' ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
              2. Perfil
            </span>
          </div>
          <div className="text-center">
            <div className={`h-1.5 rounded-full mb-1.5 ${stage === 'profile' ? 'bg-orange-500' : stage === 'success' ? 'bg-green-500' : 'bg-neutral-200 dark:bg-[#313335]'}`} />
            <span className={`text-[11px] font-bold ${stage === 'profile' ? 'text-orange-600 dark:text-orange-400' : stage === 'success' ? 'text-green-700 dark:text-green-400' : 'text-neutral-400 dark:text-[#8E918F]'}`}>
              3. Dados
            </span>
          </div>
          <div className="text-center">
            <div className={`h-1.5 rounded-full mb-1.5 ${stage === 'success' ? 'bg-green-500' : 'bg-neutral-200 dark:bg-[#313335]'}`} />
            <span className={`text-[11px] font-bold ${stage === 'success' ? 'text-green-700 dark:text-green-400' : 'text-neutral-400 dark:text-[#8E918F]'}`}>
              4. Conclusão
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* ETAPA 2: ESCOLHA DO TIPO DE CONTA (SEM TELEFONE / APENAS CARDS DE PERFIL) */}
          {/* ========================================================================= */}
          {stage === 'role' && (
            <motion.div
              key="stage-role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1.5 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  Como você deseja utilizar o PetHub?
                </h1>
                <p className="text-sm text-neutral-500 dark:text-[#8E918F]">
                  Selecione o perfil que melhor descreve sua atuação na plataforma:
                </p>
              </div>

              {/* Role Cards Grid - Isolada, sem inputs de telefone ou nome */}
              <div className="grid grid-cols-1 gap-3.5">
                {roleOptions.map((card) => {
                  const isSelected = selectedRole === card.role;
                  const IconComp = card.icon;
                  return (
                    <div
                      key={card.role}
                      onClick={() => setSelectedRole(card.role)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-xs'
                          : 'border-neutral-200 dark:border-[#313335] hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1E1F20]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/40 dark:border-orange-900/40">
                          <IconComp size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base">{card.title}</h3>
                            <span className="text-[11px] font-medium text-neutral-500 dark:text-[#8E918F] bg-neutral-100 dark:bg-[#282A2C] px-2 py-0.5 rounded-md">
                              {card.subtitle}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-[#8E918F] max-w-md leading-relaxed">
                            {card.description}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            {card.features.map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-neutral-600 dark:text-[#C4C7C5] bg-neutral-100/80 dark:bg-[#282A2C] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1"
                              >
                                <Check size={10} className="text-emerald-600 dark:text-emerald-400" /> {f}
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
                              : 'border-neutral-300 dark:border-[#313335] bg-white dark:bg-[#282A2C]'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleContinueToProfile}
                  rightIcon={<ArrowRight size={18} />}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 3: DADOS DO PERFIL / ONBOARDING (TELEFONE / WHATSAPP * OBRIGATÓRIO)  */}
          {/* ========================================================================= */}
          {stage === 'profile' && (
            <motion.div
              key="stage-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage('role')}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800 dark:hover:text-[#E3E3E3] font-semibold cursor-pointer transition-colors"
                >
                  <ArrowLeft size={16} /> Voltar para seleção de perfil
                </button>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-900/50 inline-flex items-center gap-1.5">
                  {selectedRole === 'TUTOR' && <><PawPrint size={12} /> Perfil Tutor</>}
                  {selectedRole === 'ESTABLISHMENT' && <><Building2 size={12} /> Perfil Estabelecimento</>}
                  {selectedRole === 'PROFESSIONAL' && <><Stethoscope size={12} /> Perfil Profissional</>}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                  {selectedRole === 'TUTOR' && 'Dados Pessoais do Tutor'}
                  {selectedRole === 'ESTABLISHMENT' && 'Dados do Estabelecimento'}
                  {selectedRole === 'PROFESSIONAL' && 'Dados do Profissional'}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                  Preencha os dados abaixo. O telefone/WhatsApp é obrigatório para notificações e agendamentos.
                </p>
              </div>

              {/* CAMPOS ESPECÍFICOS POR PERFIL */}
              <div className="space-y-4">
                {/* Nome Completo */}
                <Input
                  label={selectedRole === 'ESTABLISHMENT' ? 'Nome do Responsável *' : 'Nome Completo *'}
                  placeholder="Ex: Leonardo Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User size={16} />}
                  required
                />

                {/* TELEFONE / WHATSAPP * (MANDATÓRIO) */}
                <div>
                  <Input
                    label="Telefone / WhatsApp *"
                    placeholder="(14) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    error={phoneError || undefined}
                    leftIcon={<Phone size={16} />}
                    required
                  />
                  <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1 pl-1">
                    Utilizaremos para confirmação de agendamentos e contato com a plataforma.
                  </p>
                </div>

                {/* ================= TUTOR ================= */}
                {selectedRole === 'TUTOR' && (
                  <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                    <div className="p-3.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-900 dark:text-orange-200 leading-relaxed">
                        O PetHub está disponível para residentes em <strong>Ourinhos - SP</strong>. O endereço é obrigatório para entrega de compras e agendamentos.
                      </p>
                    </div>

                    <div className="relative">
                      <Input
                        label="CEP (Ourinhos - SP) *"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="19900-000"
                        maxLength={9}
                        leftIcon={<Search size={16} className={isCepLoading ? 'animate-spin text-orange-500' : ''} />}
                        hint={isCepLoading ? 'Buscando CEP...' : 'Preenchimento automático do endereço'}
                        required
                      />
                    </div>

                    {cityError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-xs font-medium">
                        {cityError}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Input
                          label="Rua / Avenida *"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Nome da rua"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          label="Número *"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Bairro *"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Centro"
                        required
                      />
                      <Input
                        label="Complemento"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Apto 12 (opcional)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Cidade"
                        value={city || 'Ourinhos'}
                        disabled
                      />
                      <Input
                        label="Estado"
                        value={state || 'SP'}
                        disabled
                      />
                    </div>
                  </div>
                )}

                {/* ================= ESTABELECIMENTO ================= */}
                {selectedRole === 'ESTABLISHMENT' && (
                  <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                        Estabelecimentos devem ser sediados em <strong>Ourinhos - SP</strong> e passam por análise administrativa antes da publicação no catálogo.
                      </p>
                    </div>

                    <Input
                      label="Nome Fantasia do Estabelecimento *"
                      placeholder="Ex: PetCare Ourinhos"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      leftIcon={<Building2 size={16} />}
                      required
                    />

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                        Tipo de Estabelecimento *
                      </label>
                      <select
                        value={establishmentType}
                        onChange={(e) => setEstablishmentType(e.target.value)}
                        className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm font-medium"
                      >
                        {establishmentTypes.map((t) => (
                          <option key={t} value={t} className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        label="CNPJ ou CPF do Responsável *"
                        placeholder="00.000.000/0000-00 ou 000.000.000-00"
                        value={estabDocument}
                        onChange={(e) => setEstabDocument(formatDocumentAuto(e.target.value))}
                        maxLength={18}
                        required
                      />
                      {estabDocument.replace(/\D/g, '').length >= 11 && !validateDocument(estabDocument, 'auto').isValid && (
                        <p className="text-[11px] text-red-500 font-medium mt-1">
                          {validateDocument(estabDocument, 'auto').error}
                        </p>
                      )}
                    </div>

                    {/* CEP & ViaCEP */}
                    <div className="relative">
                      <Input
                        label="CEP (Ourinhos - SP) *"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="19900-000"
                        maxLength={9}
                        leftIcon={<Search size={16} className={isCepLoading ? 'animate-spin text-orange-500' : ''} />}
                        hint={isCepLoading ? 'Buscando CEP...' : 'Preenchimento automático do endereço'}
                        required
                      />
                    </div>

                    {cityError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-xs font-medium">
                        {cityError}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Input
                          label="Rua / Avenida *"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Nome da rua"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          label="Número *"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Bairro *"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Centro"
                        required
                      />
                      <Input
                        label="Complemento"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Sala 2, Bloco A"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-500 dark:text-[#8E918F] uppercase mb-1">Cidade</label>
                        <div className="p-3 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-700 dark:text-[#E3E3E3] text-sm font-bold">
                          {city}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-500 dark:text-[#8E918F] uppercase mb-1">Estado</label>
                        <div className="p-3 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-700 dark:text-[#E3E3E3] text-sm font-bold">
                          {state}
                        </div>
                      </div>
                    </div>

                    {/* Fotos do Estabelecimento */}
                    <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
                            Fotos do Estabelecimento / Fachada *
                          </label>
                          <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                            Obrigatório enviar pelo menos 1 foto real para aprovação
                          </p>
                        </div>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 px-2 py-0.5 rounded-full">
                          {establishmentPhotos.length} foto(s)
                        </span>
                      </div>

                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />

                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="w-full border-2 border-dashed border-orange-300 dark:border-orange-700/60 hover:border-orange-500 dark:hover:border-orange-500 bg-white dark:bg-[#282A2C] rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-neutral-600 dark:text-[#C4C7C5] transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                          <Camera size={20} />
                        </div>
                        <span className="text-sm font-bold text-neutral-800 dark:text-[#E3E3E3]">
                          {isUploadingPhoto ? 'Enviando foto...' : 'Adicionar foto do estabelecimento'}
                        </span>
                        <span className="text-xs text-neutral-400 dark:text-[#8E918F]">Clique para selecionar fotos (PNG, JPG)</span>
                      </button>

                      {establishmentPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          {establishmentPhotos.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] aspect-video bg-neutral-100 dark:bg-[#282A2C]"
                            >
                              <img
                                src={getFullImageUrl(url)}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow"
                                title="Remover foto"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                        Descrição do Estabelecimento (Opcional)
                      </label>
                      <textarea
                        value={estabDescription}
                        onChange={(e) => setEstabDescription(e.target.value)}
                        className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                        rows={3}
                        placeholder="Descreva seus serviços e diferenciais..."
                      />
                    </div>
                  </div>
                )}

                {/* ================= PROFISSIONAL ================= */}
                {selectedRole === 'PROFESSIONAL' && (
                  <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-[#313335]">
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
                      <Stethoscope className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                        Profissionais passam por análise administrativa antes da liberação pública do perfil e agenda.
                      </p>
                    </div>

                    <div>
                      <Input
                        label="CPF do Profissional *"
                        placeholder="000.000.000-00"
                        value={profDocument}
                        onChange={(e) => setProfDocument(formatCPF(e.target.value))}
                        maxLength={14}
                        required
                      />
                      {profDocument.replace(/\D/g, '').length === 11 && !validateCPF(profDocument).isValid && (
                        <p className="text-[11px] text-red-500 font-medium mt-1">
                          {validateCPF(profDocument).error}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                        Especialidade / Atuação Principal *
                      </label>
                      <select
                        value={profSpecialty}
                        onChange={(e) => setProfSpecialty(e.target.value)}
                        className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm font-medium"
                      >
                        {professionalSpecialties.map((s) => (
                          <option key={s} value={s} className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                        Biografia / Sobre Você (Opcional)
                      </label>
                      <textarea
                        value={profBio}
                        onChange={(e) => setProfBio(e.target.value)}
                        className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                        rows={3}
                        placeholder="Fale sobre sua formação, experiência e atendimento..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleSubmitProfile}
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !!cityError || isCepLoading || isUploadingPhoto}
                  rightIcon={<ArrowRight size={18} />}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  {isSubmitting ? 'Salvando dados...' : 'Concluir cadastro e entrar'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 4: FINALIZAÇÃO DA CONTA                                             */}
          {/* ========================================================================= */}
          {stage === 'success' && (
            <motion.div
              key="stage-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                {selectedRole === 'TUTOR' ? <CheckCircle2 size={40} /> : <Clock size={40} />}
              </div>

              {selectedRole === 'TUTOR' ? (
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                    Conta criada com sucesso!
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-[#8E918F] max-w-md mx-auto leading-relaxed">
                    Bem-vindo ao <strong>PetHub</strong>! Sua conta de tutor está ativa e pronta para uso.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
                    Cadastro enviado para análise!
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-[#8E918F] max-w-md mx-auto leading-relaxed">
                    Seus dados foram registrados com sucesso. Nossa equipe administrativa analisará as informações cadastradas.
                  </p>
                </div>
              )}

              {/* Status Box */}
              <div className="bg-neutral-50 dark:bg-[#282A2C] rounded-2xl p-5 text-left space-y-3.5 border border-neutral-200/80 dark:border-[#313335]">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    <Check size={13} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Conta registrada no PetHub</p>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                      Autenticado como: <strong className="text-neutral-800 dark:text-[#E3E3E3]">{email}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    <Check size={13} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Telefone verificado</p>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                      Contato principal: <strong className="text-neutral-800 dark:text-[#E3E3E3]">{phone}</strong>
                    </p>
                  </div>
                </div>

                {selectedRole !== 'TUTOR' && (
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      <Clock size={13} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Aprovação em andamento</p>
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                        Você já pode acessar o painel para gerenciar produtos, serviços e conferir suas configurações.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {selectedRole === 'TUTOR' ? (
                  <>
                    <Button
                      fullWidth
                      size="lg"
                      onClick={() => navigate('/auth/onboarding')}
                      rightIcon={<ArrowRight size={18} />}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      Cadastrar meu primeiro pet
                    </Button>
                    <Button
                      fullWidth
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/tutor')}
                      className="text-neutral-700 dark:text-[#E3E3E3] dark:border-[#313335]"
                    >
                      Ir para o Início
                    </Button>
                  </>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={() =>
                      navigate(selectedRole === 'ESTABLISHMENT' ? '/estabelecimento' : '/profissional')
                    }
                    rightIcon={<ArrowRight size={18} />}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    Acessar meu painel
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
