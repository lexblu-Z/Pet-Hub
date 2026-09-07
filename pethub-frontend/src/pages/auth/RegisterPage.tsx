import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, User, Mail, Phone, Lock, ArrowRight, ArrowLeft, Building2, MapPin, Search, Camera, Check, Upload, Trash2, Stethoscope, FileText, Sparkles, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Input, Button, Progress } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { formatPhone, validatePhone } from '@/utils/phone';
import { formatCPF, formatDocumentAuto, validateCPF, validateDocument, normalizeDocument } from '@/utils/documentValidation';
import { SPECIES_OPTIONS } from '@/utils/species';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import type { UserRole } from '@/types';

const roleOptions = [
  { role: 'tutor' as UserRole, icon: PawPrint, title: 'Tutor', desc: 'Quero cuidar do meu pet e agendar serviços' },
  { role: 'estabelecimento' as UserRole, icon: Building2, title: 'Estabelecimento', desc: 'Tenho um pet shop, clínica ou serviço pet' },
  { role: 'profissional' as UserRole, icon: Stethoscope, title: 'Profissional', desc: 'Sou veterinário, tosador, adestrador ou passeador' },
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

export default function RegisterPage() {
  const [regMethod, setRegMethod] = useState<'choose' | 'email'>('choose');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('tutor');

  // STEP 2: Account / Responsible Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Professional specific fields
  const [profSpecialty, setProfSpecialty] = useState(professionalSpecialties[0]);
  const [profBio, setProfBio] = useState('');

  // Accepted species for Establishment & Professional
  const [acceptedSpecies, setAcceptedSpecies] = useState<string[]>(['dog', 'cat']);

  const handleToggleAcceptedSpecies = (speciesId: string) => {
    setAcceptedSpecies(prev => {
      if (prev.includes(speciesId)) {
        return prev.filter(s => s !== speciesId);
      } else {
        return [...prev, speciesId];
      }
    });
  };

  // STEP 3: Establishment Data
  const [businessName, setBusinessName] = useState('');
  const [establishmentType, setEstablishmentType] = useState('Pet shop');
  const [description, setDescription] = useState('');
  
  // Mandatory Establishment Photos
  const [establishmentPhotos, setEstablishmentPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Address & ViaCEP
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Ourinhos');
  const [state, setState] = useState('SP');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  // Professional Workplace Photo states
  const [workplacePhoto, setWorkplacePhoto] = useState<string | null>(null);
  const [isUploadingWorkplacePhoto, setIsUploadingWorkplacePhoto] = useState(false);
  const workplacePhotoInputRef = useRef<HTMLInputElement>(null);

  // Mandatory Cashback Policy Terms Acceptance for Partners
  const [acceptedCashbackTerms, setAcceptedCashbackTerms] = useState(false);

  // Email verification OTP modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [isSendingRegOtp, setIsSendingRegOtp] = useState(false);
  const [regOtpCooldown, setRegOtpCooldown] = useState(0);

  useEffect(() => {
    if (regOtpCooldown <= 0) return;
    const timer = setInterval(() => setRegOtpCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [regOtpCooldown]);

  const { login } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const totalSteps = 4;
  const progressValue = (step / totalSteps) * 100;

  // Mask & Search CEP
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

        // Validate Ourinhos - SP restriction
        if (data.localidade?.trim().toLowerCase() !== 'ourinhos' || data.uf?.trim().toUpperCase() !== 'SP') {
          setCityError('No momento, o PetHub está disponível apenas para residentes e estabelecimentos de Ourinhos - SP.');
        } else {
          setCityError(null);
          toast.success('Endereço preenchido com sucesso!');
        }
      } catch (err) {
        toast.error('Erro ao consultar CEP. Preencha o endereço manualmente.');
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
          setEstablishmentPhotos(prev => [...prev, res.data.url]);
        }
      }
      toast.success('Foto(s) adicionada(s) com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEstablishmentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleWorkplacePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Selecione uma imagem JPG, JPEG, PNG ou WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploadingWorkplacePhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData);
      if (res.data?.url) {
        setWorkplacePhoto(res.data.url);
        toast.success('Foto do local de atendimento adicionada com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao enviar foto do local. Tente novamente.');
    } finally {
      setIsUploadingWorkplacePhoto(false);
      if (workplacePhotoInputRef.current) workplacePhotoInputRef.current.value = '';
    }
  };

  const handleRemoveWorkplacePhoto = () => {
    setWorkplacePhoto(null);
    if (workplacePhotoInputRef.current) workplacePhotoInputRef.current.value = '';
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!name || !email || !phone || !password || !confirmPassword) {
        toast.error('Preencha todos os campos obrigatórios.');
        return;
      }
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) {
        toast.error(phoneVal.error || 'Digite um número de telefone válido.');
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        toast.error('Informe um e-mail válido (exemplo: usuario@email.com).');
        return;
      }
      if (selectedRole === 'tutor') {
        if (!document.trim()) {
          toast.error('O CPF do tutor é obrigatório.');
          return;
        }
        const docVal = validateCPF(document);
        if (!docVal.isValid) {
          toast.error(docVal.error || 'Informe um CPF válido.');
          return;
        }
      } else if (selectedRole === 'profissional') {
        if (!document.trim()) {
          toast.error('O CPF do profissional é obrigatório.');
          return;
        }
        const docVal = validateCPF(document);
        if (!docVal.isValid) {
          toast.error(docVal.error || 'Informe um CPF válido.');
          return;
        }
      } else if (selectedRole === 'estabelecimento') {
        if (!document.trim()) {
          toast.error('O CNPJ ou CPF do responsável é obrigatório.');
          return;
        }
        const docVal = validateDocument(document, 'auto');
        if (!docVal.isValid) {
          toast.error(docVal.error || 'Informe um CNPJ ou CPF válido.');
          return;
        }
      }
      if (password === '12345678') {
        toast.error('Essa senha é muito comum. Por favor, escolha uma senha mais forte.');
        return;
      }
      if (password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password === '123456' || password === '1234567' || password.toLowerCase() === 'password') {
        toast.error('Essa senha é muito fraca e previsível. Escolha uma senha mais segura.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
      }

      setStep(3); // Go to step 3 (Address / Details) for all roles
    } else if (step === 3 && selectedRole === 'tutor') {
      if (!cep || !street || !number || !neighborhood) {
        toast.error('Preencha o endereço completo (CEP, Rua, Número e Bairro).');
        return;
      }
      if (city.trim().toLowerCase() !== 'ourinhos' || state.trim().toUpperCase() !== 'SP') {
        setCityError('No momento, o PetHub está disponível apenas para tutores residentes em Ourinhos - SP.');
        toast.error('Cadastro de tutor permitido apenas para Ourinhos - SP.');
        return;
      }
      const cleanCep = cep.replace(/\D/g, '');
      const prefix = parseInt(cleanCep.slice(0, 5), 10);
      if (cleanCep.length !== 8 || prefix < 19900 || prefix > 19919) {
        setCityError('O CEP informado não pertence a Ourinhos - SP.');
        toast.error('O CEP deve pertencer ao município de Ourinhos - SP.');
        return;
      }
      handleRequestVerification();
    } else if (step === 3 && selectedRole === 'estabelecimento') {
      if (!businessName) {
        toast.error('Informe o nome do estabelecimento.');
        return;
      }
      if (!street || !number || !neighborhood) {
        toast.error('Preencha o endereço completo (Rua, Número e Bairro).');
        return;
      }
      if (city.trim().toLowerCase() !== 'ourinhos' || state.trim().toUpperCase() !== 'SP') {
        setCityError('No momento, o PetHub está disponível apenas para estabelecimentos localizados em Ourinhos - SP.');
        toast.error('Cadastro permitido apenas para Ourinhos - SP.');
        return;
      }
      if (establishmentPhotos.length === 0) {
        toast.error('É obrigatório adicionar pelo menos 1 foto do estabelecimento para verificação.');
        return;
      }
      if (!acceptedSpecies || acceptedSpecies.length === 0) {
        toast.error('Selecione pelo menos uma espécie atendida pelo estabelecimento.');
        return;
      }
      handleRequestVerification();
    } else if (step === 3 && selectedRole === 'profissional') {
      if (!workplacePhoto) {
        toast.error('A foto do local de atendimento é obrigatória.');
        return;
      }
      if (!acceptedSpecies || acceptedSpecies.length === 0) {
        toast.error('Selecione pelo menos uma espécie que você atende.');
        return;
      }
      if (!cep || !street || !number || !neighborhood || !city || !state) {
        toast.error('Preencha o endereço completo de atendimento (CEP, Rua, Número e Bairro).');
        return;
      }
      handleRequestVerification();
    }
  };

  const handleRequestVerification = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setIsSendingRegOtp(true);
    try {
      await api.post('/auth/otp/send', { email: cleanEmail });
      toast.success('Código de verificação enviado para seu e-mail!');
      setRegOtpCooldown(60);
      setShowOtpModal(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao enviar código por e-mail.';
      toast.error(msg);
      // Em caso de falha de envio, permite prosseguir diretamente
      handleFinish();
    } finally {
      setIsSendingRegOtp(false);
    }
  };

  const handleFinish = async (code?: string) => {
    setIsLoading(true);
    try {
      const roleMap: Record<string, string> = {
        tutor: 'TUTOR',
        estabelecimento: 'ESTABLISHMENT',
        profissional: 'PROFESSIONAL',
      };

      const fullAddress = [
        street,
        number ? `nº ${number}` : '',
        complement ? `(${complement})` : '',
        neighborhood ? `- ${neighborhood}` : '',
        city ? `${city}/${state}` : '',
      ].filter(Boolean).join(' ');

      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        code: code || undefined,
        document: normalizeDocument(document) || undefined,
        role: roleMap[selectedRole] || 'TUTOR',
      };

      if (selectedRole === 'tutor') {
        payload.address = street;
        payload.number = number;
        payload.complement = complement || undefined;
        payload.neighborhood = neighborhood;
        payload.city = city || 'Ourinhos';
        payload.state = state || 'SP';
        payload.zipCode = cep;
      } else if (selectedRole === 'estabelecimento') {
        payload.businessName = businessName;
        payload.establishmentType = establishmentType;
        payload.description = description || undefined;
        payload.address = fullAddress;
        payload.city = city || 'Ourinhos';
        payload.state = state || 'SP';
        payload.zipCode = cep || undefined;
        payload.businessPhone = phone;
        payload.businessEmail = email;
        payload.photos = establishmentPhotos;
        payload.acceptedSpecies = acceptedSpecies;
      } else if (selectedRole === 'profissional') {
        payload.specialty = profSpecialty;
        payload.bio = profBio || undefined;
        payload.document = document || undefined;
        payload.workplacePhoto = workplacePhoto || undefined;
        payload.address = street || undefined;
        payload.number = number || undefined;
        payload.complement = complement || undefined;
        payload.neighborhood = neighborhood || undefined;
        payload.city = city || undefined;
        payload.state = state || undefined;
        payload.zipCode = cep || undefined;
        payload.acceptedSpecies = acceptedSpecies;
      }

      if (selectedRole === 'estabelecimento' || selectedRole === 'profissional') {
        if (!acceptedCashbackTerms) {
          toast.error('É obrigatório aceitar os termos do programa de cashback universal (v1.0) para se cadastrar.');
          return;
        }
        payload.acceptedCashbackTerms = true;
      }

      const response = await api.post('/auth/register', payload);
      setShowOtpModal(false);

      if (response.data.pendingApproval) {
        toast.success('Cadastro enviado com sucesso!');
        setStep(totalSteps);
      } else {
        const { token, user } = response.data;
        login(token, user, user.role.toLowerCase() as UserRole);
        toast.success('Conta criada com sucesso! Bem-vindo ao PetHub!');
        navigate('/auth/onboarding');
      }
    } catch (error: any) {
      console.error('Register error:', error?.response?.data || error);
      const message = error.response?.data?.error || 'Erro ao criar conta. Verifique os dados e tente novamente.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await api.get('/auth/google/url?returnTo=/');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Não foi possível iniciar o cadastro com o Google.');
      }
    } catch (err) {
      toast.error('Erro ao conectar ao serviço Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (regMethod === 'choose') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#131314] flex items-center justify-center px-4 py-12 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-3xl border border-neutral-200/80 dark:border-[#313335] shadow-sm p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xs">
              <PawPrint size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Crie sua conta no PetHub</h1>
            <p className="text-sm text-neutral-500 dark:text-[#8E918F]">
              Escolha como prefere começar sua experiência:
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 dark:bg-[#282A2C] dark:hover:bg-[#313335] border border-neutral-300 hover:border-neutral-400 dark:border-[#313335] rounded-2xl text-sm font-semibold text-neutral-700 dark:text-[#E3E3E3] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Continuar com Google'}</span>
            </button>

            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] text-center">
              Você poderá conectar o Google Calendar separadamente depois.
            </p>

            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-[#313335]" />
              </div>
              <span className="relative bg-white dark:bg-[#1E1F20] px-3 text-xs text-neutral-400 dark:text-[#8E918F] font-medium">
                ou
              </span>
            </div>

            <Button
              type="button"
              fullWidth
              size="lg"
              variant="outline"
              leftIcon={<Mail size={18} />}
              onClick={() => setRegMethod('email')}
              className="font-bold border-2 border-neutral-300 dark:border-[#313335] hover:border-orange-500 text-neutral-800 dark:text-[#E3E3E3] hover:text-orange-600 dark:hover:text-orange-500 rounded-2xl py-3.5"
            >
              Continuar com e-mail
            </Button>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] text-center text-sm text-neutral-500 dark:text-[#8E918F]">
            Já possui uma conta?{' '}
            <Link to="/auth/login" className="font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#131314] flex items-center justify-center px-4 py-12 transition-colors">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          {step === 1 && (
            <button
              type="button"
              onClick={() => setRegMethod('choose')}
              className="text-xs text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3] flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={14} /> Outras opções
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progressValue} size="sm" color="orange" />
          <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-2 text-right">
            Etapa {step} de {totalSteps}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Como você quer usar o PetHub?</h2>
              <p className="text-neutral-500 dark:text-[#8E918F] mb-6">Selecione o perfil que melhor descreve você</p>

              <div className="space-y-3 mb-8">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.role}
                      onClick={() => setSelectedRole(opt.role)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                        selectedRole === opt.role
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm'
                          : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{opt.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">{opt.desc}</p>
                      </div>
                      {selectedRole === opt.role && (
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button fullWidth size="lg" onClick={handleNext} rightIcon={<ArrowRight size={18} />}>
                Continuar
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Responsible / Account Data */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3] mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Dados da Conta</h2>
              <p className="text-neutral-500 dark:text-[#8E918F] mb-6">Preencha suas informações para criar a conta</p>

              {selectedRole !== 'tutor' && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl mb-6 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                    Após o cadastro, a sua conta passará por uma análise administrativa antes de ter suas funcionalidades liberadas publicamente.
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-8">
                <Input
                  label={selectedRole === 'estabelecimento' ? "Nome do responsável *" : "Nome completo *"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User size={16} />}
                  placeholder="Ex: Leonardo Silva"
                  required
                />
                <Input
                  label="E-mail *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={16} />}
                  placeholder="seu@email.com"
                  required
                />
                <Input
                  label="Telefone / WhatsApp *"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  leftIcon={<Phone size={16} />}
                  placeholder="(14) 99999-9999"
                  required
                />

                {selectedRole === 'tutor' && (
                  <div>
                    <Input
                      label="CPF do Tutor *"
                      value={document}
                      onChange={(e) => setDocument(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                    {document.replace(/\D/g, '').length === 11 && !validateCPF(document).isValid && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">
                        {validateCPF(document).error}
                      </p>
                    )}
                    {document.replace(/\D/g, '').length > 0 && document.replace(/\D/g, '').length < 11 && (
                      <p className="text-[11px] text-neutral-400 font-medium mt-1">
                        Digite os 11 dígitos do CPF
                      </p>
                    )}
                  </div>
                )}

                {selectedRole === 'estabelecimento' && (
                  <div>
                    <Input
                      label="CNPJ ou CPF do Responsável *"
                      value={document}
                      onChange={(e) => setDocument(formatDocumentAuto(e.target.value))}
                      placeholder="00.000.000/0000-00 ou 000.000.000-00"
                      maxLength={18}
                      required
                    />
                    {document.replace(/\D/g, '').length >= 11 && !validateDocument(document, 'auto').isValid && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">
                        {validateDocument(document, 'auto').error}
                      </p>
                    )}
                  </div>
                )}

                {/* Professional Fields */}
                {selectedRole === 'profissional' && (
                  <>
                    <div>
                      <Input
                        label="CPF do Profissional *"
                        value={document}
                        onChange={(e) => setDocument(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                      />
                      {document.replace(/\D/g, '').length === 11 && !validateCPF(document).isValid && (
                        <p className="text-[11px] text-red-500 font-medium mt-1">
                          {validateCPF(document).error}
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
                        {professionalSpecialties.map(s => <option key={s} value={s} className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">{s}</option>)}
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
                        placeholder="Fale um pouco sobre sua formação, experiência com animais e especialidades..."
                      />
                    </div>
                  </>
                )}

                <Input
                  label="Senha *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock size={16} />}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                {password === '12345678' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1 animate-fade-in">
                    <p className="font-bold text-amber-900 dark:text-amber-300">Senha muito comum</p>
                    <p className="text-amber-800 dark:text-amber-400 font-medium">Por favor, crie uma senha mais forte e segura.</p>
                  </div>
                )}
                <Input
                  label="Confirmar senha *"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock size={16} />}
                  placeholder="Repita a senha"
                  required
                />
              </div>

              <Button fullWidth size="lg" onClick={handleNext} isLoading={isLoading} rightIcon={<ArrowRight size={18} />}>
                {selectedRole === 'estabelecimento'
                  ? 'Próximo: dados do estabelecimento'
                  : selectedRole === 'profissional'
                  ? 'Próximo: local de atendimento'
                  : 'Próximo: endereço residencial'}
              </Button>
            </motion.div>
          )}

          {/* STEP 3: Tutor Residential Address with ViaCEP */}
          {step === 3 && selectedRole === 'tutor' && (
            <motion.div
              key="step3-tutor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3] mb-6 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Endereço Residencial</h2>
              <p className="text-neutral-500 dark:text-[#8E918F] mb-6">
                Informe seu endereço em Ourinhos - SP para entregas e agendamentos
              </p>

              <div className="space-y-4 mb-8">
                <div className="p-3.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl flex items-start gap-2.5 text-xs text-orange-900 dark:text-orange-200">
                  <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <span>
                    O PetHub está disponível para a cidade de <strong>Ourinhos - SP</strong>. O endereço é obrigatório para compras e recebimento de pedidos.
                  </span>
                </div>

                <div className="relative">
                  <Input
                    label="CEP (Ourinhos - SP) *"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="19900-000"
                    maxLength={9}
                    leftIcon={<Search size={16} className={isCepLoading ? 'animate-spin text-orange-500' : ''} />}
                    hint={isCepLoading ? 'Consultando ViaCEP...' : 'Digite o CEP para buscar o endereço automaticamente'}
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
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] block mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city || 'Ourinhos'}
                      disabled
                      className="w-full text-sm px-3.5 py-2.5 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-600 dark:text-[#8E918F] cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5] block mb-1">Estado</label>
                    <input
                      type="text"
                      value={state || 'SP'}
                      disabled
                      className="w-full text-sm px-3.5 py-2.5 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-neutral-600 dark:text-[#8E918F] cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              <Button fullWidth size="lg" onClick={handleNext} isLoading={isLoading || isSendingRegOtp} rightIcon={<ArrowRight size={18} />}>
                {isSendingRegOtp ? 'Enviando código...' : 'Finalizar cadastro'}
              </Button>
            </motion.div>
          )}

          {/* STEP 3: Establishment Details with Photos & ViaCEP */}
          {step === 3 && selectedRole === 'estabelecimento' && (
            <motion.div
              key="step3-estab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3] mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Dados do Estabelecimento</h2>
              <p className="text-neutral-500 dark:text-[#8E918F] mb-6">Informe os dados e fotos do seu negócio em Ourinhos - SP</p>

              <div className="space-y-4 mb-8">
                <Input
                  label="Nome Fantasia do Estabelecimento *"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  leftIcon={<Building2 size={16} />}
                  placeholder="Ex: PetCare Ourinhos"
                  required
                />

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                    Tipo de estabelecimento *
                  </label>
                  <select
                    value={establishmentType}
                    onChange={(e) => setEstablishmentType(e.target.value)}
                    className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm font-medium"
                  >
                    {establishmentTypes.map(t => <option key={t} value={t} className="dark:bg-[#282A2C] dark:text-[#E3E3E3]">{t}</option>)}
                  </select>
                </div>

                {/* Accepted Species Selection */}
                <div className="p-4 bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-2xl space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      Quais tipos de animais seu estabelecimento atende? *
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                      Selecione todas as espécies que seu estabelecimento está apto a receber (mínimo 1)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {SPECIES_OPTIONS.map((opt) => {
                      const isSelected = acceptedSpecies.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleAcceptedSpecies(opt.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm'
                              : 'bg-neutral-50 dark:bg-[#1E1F20] border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <SpeciesIcon speciesId={opt.id} size={16} className={isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-400'} />
                            <span>{opt.label}</span>
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {acceptedSpecies.length === 0 && (
                    <p className="text-xs text-red-500 font-medium">Selecione pelo menos 1 espécie atendida.</p>
                  )}
                </div>

                {/* Mandatory Photos Section */}
                <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
                        Fotos do Estabelecimento / Fachada *
                      </label>
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                        Obrigatório enviar pelo menos 1 foto real para aprovação administrativa
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
                    <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
                      Clique para abrir o explorador de arquivos (PNG, JPG, JPEG)
                    </span>
                  </button>

                  {/* Photos Preview Grid */}
                  {establishmentPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {establishmentPhotos.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] aspect-video bg-neutral-100 dark:bg-[#282A2C]">
                          <img src={getFullImageUrl(url)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow transition-opacity"
                            title="Remover foto"
                          >
                            <Trash2 size={12} />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-neutral-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Principal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CEP with automatic lookup */}
                <div className="relative">
                  <Input
                    label="CEP (digite para preencher o endereço automaticamente) *"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="19900-000"
                    maxLength={9}
                    leftIcon={<Search size={16} className={isCepLoading ? "animate-spin text-orange-500" : ""} />}
                    hint={isCepLoading ? "Consultando ViaCEP..." : "Ex: 19900-000 (Ourinhos - SP)"}
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
                    placeholder="Sala 2, Bloco A..."
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

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3] mb-1.5">
                    Descrição do Estabelecimento (Opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-3 text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#282A2C] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                    rows={3}
                    placeholder="Conte sobre os serviços, especialidades e diferenciais do seu pet shop ou clínica..."
                  />
                </div>

                {/* Mandatory Cashback Policy Terms Acceptance (v1.0) */}
                <div className="p-4 bg-orange-50/60 dark:bg-[#282A2C] border border-orange-200/80 dark:border-[#313335] rounded-2xl space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="cashback-terms-est"
                      checked={acceptedCashbackTerms}
                      onChange={(e) => setAcceptedCashbackTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-neutral-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="cashback-terms-est" className="text-xs text-neutral-700 dark:text-[#C4C7C5] leading-relaxed cursor-pointer">
                      <strong className="block text-neutral-900 dark:text-[#E3E3E3] font-bold mb-0.5">
                        Termos do Programa de Cashback Universal PetHub (Versão 1.0) *
                      </strong>
                      Declaro que li e concordo com os Termos do Programa de Cashback Universal do PetHub (3% de cashback para tutores em compras de produtos e 5% em agendamentos de serviços, com liquidação e troco no ato do atendimento).
                    </label>
                  </div>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleNext}
                isLoading={isLoading}
                disabled={!!cityError || isCepLoading || isUploadingPhoto || !acceptedCashbackTerms}
                rightIcon={<ArrowRight size={18} />}
              >
                {isLoading ? 'Criando conta...' : 'Finalizar cadastro'}
              </Button>
            </motion.div>
          )}

          {/* STEP 3: Professional Workplace Photo & Address */}
          {step === 3 && selectedRole === 'profissional' && (
            <motion.div
              key="step3-prof"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-neutral-400 dark:text-[#8E918F] hover:text-neutral-600 dark:hover:text-[#E3E3E3] mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Local de Atendimento e Endereço</h2>
              <p className="text-neutral-500 dark:text-[#8E918F] mb-6">
                Informe onde você realiza seus atendimentos e envie uma foto do local para aprovação cadastral
              </p>

              <div className="space-y-4 mb-8">
                {/* Mandatory Workplace Photo Section */}
                <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
                        Foto do Local de Atendimento *
                      </label>
                      <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                        Esta foto mostra o ambiente de atendimento (consultório, clínica ou espaço próprio). Ela é diferente da sua foto de perfil pessoal.
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={workplacePhotoInputRef}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleWorkplacePhotoUpload}
                  />

                  {!workplacePhoto ? (
                    <button
                      type="button"
                      onClick={() => workplacePhotoInputRef.current?.click()}
                      disabled={isUploadingWorkplacePhoto}
                      className="w-full border-2 border-dashed border-orange-300 dark:border-orange-700/60 hover:border-orange-500 dark:hover:border-orange-500 bg-white dark:bg-[#282A2C] rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-neutral-600 dark:text-[#C4C7C5] transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                        <Camera size={24} />
                      </div>
                      <span className="text-sm font-bold text-neutral-800 dark:text-[#E3E3E3]">
                        {isUploadingWorkplacePhoto ? 'Enviando foto...' : 'Enviar foto do local de atendimento'}
                      </span>
                      <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
                        JPG, PNG ou WEBP até 5MB (obrigatório para aprovação)
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-[#313335] aspect-video bg-neutral-100 dark:bg-[#282A2C]">
                        <img
                          src={getFullImageUrl(workplacePhoto)}
                          alt="Foto do local de atendimento"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveWorkplacePhoto}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-90 hover:opacity-100 shadow transition-opacity cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="absolute bottom-2 left-2 bg-neutral-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Local de Atendimento
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => workplacePhotoInputRef.current?.click()}
                          disabled={isUploadingWorkplacePhoto}
                          className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                        >
                          Trocar foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accepted Species Selection for Professional */}
                <div className="p-4 bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-2xl space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      Quais tipos de animais você atende? *
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5">
                      Selecione todas as espécies com as quais você realiza atendimentos (mínimo 1)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {SPECIES_OPTIONS.map((opt) => {
                      const isSelected = acceptedSpecies.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleAcceptedSpecies(opt.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm'
                              : 'bg-neutral-50 dark:bg-[#1E1F20] border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <SpeciesIcon speciesId={opt.id} size={16} className={isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-400'} />
                            <span>{opt.label}</span>
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {acceptedSpecies.length === 0 && (
                    <p className="text-xs text-red-500 font-medium">Selecione pelo menos 1 espécie atendida.</p>
                  )}
                </div>

                {/* CEP with automatic lookup */}
                <div className="relative">
                  <Input
                    label="CEP do Local de Atendimento *"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="19900-000"
                    maxLength={9}
                    leftIcon={<Search size={16} className={isCepLoading ? "animate-spin text-orange-500" : ""} />}
                    hint={isCepLoading ? "Consultando ViaCEP..." : "Digite o CEP para buscar o endereço automaticamente"}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input
                      label="Rua / Avenida *"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Nome da rua ou avenida"
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
                    placeholder="Bairro"
                    required
                  />
                  <Input
                    label="Complemento (Sala / Bloco)"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Sala 12, Bloco B..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Cidade *"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Estado (UF) *"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                {/* Mandatory Cashback Policy Terms Acceptance (v1.0) */}
                <div className="p-4 bg-orange-50/60 dark:bg-[#282A2C] border border-orange-200/80 dark:border-[#313335] rounded-2xl space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="cashback-terms-prof"
                      checked={acceptedCashbackTerms}
                      onChange={(e) => setAcceptedCashbackTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-neutral-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="cashback-terms-prof" className="text-xs text-neutral-700 dark:text-[#C4C7C5] leading-relaxed cursor-pointer">
                      <strong className="block text-neutral-900 dark:text-[#E3E3E3] font-bold mb-0.5">
                        Termos do Programa de Cashback Universal PetHub (Versão 1.0) *
                      </strong>
                      Declaro que li e concordo com os Termos do Programa de Cashback Universal do PetHub (3% de cashback para tutores em compras de produtos e 5% em agendamentos de serviços, com liquidação e troco no ato do atendimento).
                    </label>
                  </div>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleNext}
                isLoading={isLoading}
                disabled={!workplacePhoto || isCepLoading || isUploadingWorkplacePhoto || !acceptedCashbackTerms}
                rightIcon={<ArrowRight size={18} />}
              >
                {isLoading ? 'Criando conta...' : 'Finalizar cadastro'}
              </Button>
            </motion.div>
          )}

          {/* STEP 4: Confirmation Screen */}
          {step === totalSteps && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-emerald-950/40 text-green-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 size={40} />
              </div>

              {selectedRole === 'tutor' ? (
                <>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Conta criada!</h2>
                  <p className="text-neutral-500 dark:text-[#8E918F] mb-8">Bem-vindo ao PetHub! Sua conta de tutor está pronta.</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Cadastro recebido!</h2>
                  <p className="text-neutral-500 dark:text-[#8E918F] mb-6 text-sm">
                    {selectedRole === 'estabelecimento'
                      ? 'Seu cadastro de estabelecimento foi enviado para análise da equipe PetHub.'
                      : 'Seu cadastro profissional foi enviado para análise da equipe PetHub.'}
                  </p>
                  
                  <div className="bg-neutral-50 dark:bg-[#282A2C] rounded-2xl p-5 mb-8 text-left space-y-3.5 border border-neutral-100 dark:border-[#313335]">
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        <Check size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Conta criada com sucesso</p>
                        <p className="text-xs text-neutral-500 dark:text-[#8E918F]">Seus dados de acesso foram registrados no sistema.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        <Clock size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">Aguardando aprovação</p>
                        <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                          Um administrador irá analisar as informações cadastradas. Enquanto isso, você poderá acessar sua conta para conferir seus dados.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button fullWidth size="lg" onClick={() => navigate('/auth/login')}>
                Fazer Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center mt-6 text-sm text-neutral-500 dark:text-[#8E918F]">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-orange-500 font-semibold hover:text-orange-600 dark:hover:text-orange-400">
            Fazer login
          </Link>
        </p>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-100 dark:border-[#313335] space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Confirme seu E-mail</h3>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F] leading-relaxed">
                Enviamos um código de verificação de 6 dígitos para:
                <br />
                <strong className="text-neutral-800 dark:text-[#E3E3E3]">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-[#C4C7C5] mb-2 text-center">
                Digite o código de 6 dígitos:
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={regOtpCode}
                onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3.5 px-4 bg-white dark:bg-[#282A2C] border-2 border-neutral-300 dark:border-[#313335] focus:border-orange-500 rounded-2xl outline-none transition-all text-neutral-900 dark:text-[#E3E3E3] shadow-xs"
                autoFocus
              />
            </div>

            <Button
              type="button"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={regOtpCode.length !== 6}
              onClick={() => handleFinish(regOtpCode)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
            >
              Confirmar e criar conta
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-neutral-500 dark:text-[#8E918F] hover:text-neutral-800 dark:hover:text-[#E3E3E3] font-medium cursor-pointer"
              >
                Voltar e editar
              </button>

              {regOtpCooldown > 0 ? (
                <span className="text-neutral-400 dark:text-[#8E918F] font-medium">
                  Reenviar em <strong>{regOtpCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  disabled={isSendingRegOtp}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold cursor-pointer"
                >
                  Reenviar código
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
