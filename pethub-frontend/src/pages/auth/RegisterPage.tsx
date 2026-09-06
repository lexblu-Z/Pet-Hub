import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, User, Mail, Phone, Lock, ArrowRight, ArrowLeft, Building2, MapPin, Search, Camera, Check, Upload, Trash2, Stethoscope, FileText, Sparkles } from 'lucide-react';
import { Input, Button, Progress } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import type { UserRole } from '@/types';

const roleOptions = [
  { role: 'tutor' as UserRole, emoji: '🐾', title: 'Tutor', desc: 'Quero cuidar do meu pet e agendar serviços' },
  { role: 'estabelecimento' as UserRole, emoji: '🏬', title: 'Estabelecimento', desc: 'Tenho um pet shop, clínica ou serviço pet' },
  { role: 'profissional' as UserRole, emoji: '👨‍⚕️', title: 'Profissional', desc: 'Sou veterinário, tosador, adestrador ou passeador' },
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

  const { login } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const totalSteps = selectedRole === 'estabelecimento' ? 4 : 3;
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
          setCityError('No momento, o PetHub está disponível apenas para estabelecimentos localizados em Ourinhos - SP.');
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

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!name || !email || !phone || !password || !confirmPassword) {
        toast.error('Preencha todos os campos obrigatórios.');
        return;
      }
      if (selectedRole !== 'tutor' && !document) {
        toast.error(selectedRole === 'estabelecimento' ? 'O CNPJ/CPF é obrigatório.' : 'O CPF / Registro Profissional é obrigatório.');
        return;
      }
      if (password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
      }

      if (selectedRole === 'estabelecimento') {
        setStep(3); // Go to establishment details & photos
      } else {
        handleFinish(); // Tutor or professional
      }
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
      handleFinish();
    }
  };

  const handleFinish = async () => {
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
        name,
        email,
        phone,
        password,
        document: document || undefined,
        role: roleMap[selectedRole] || 'TUTOR',
      };

      if (selectedRole === 'estabelecimento') {
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
      } else if (selectedRole === 'profissional') {
        payload.specialty = profSpecialty;
        payload.bio = profBio || undefined;
        payload.document = document || undefined;
      }

      const response = await api.post('/auth/register', payload);

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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xs">
              <PawPrint size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-neutral-900">Crie sua conta no PetHub</h1>
            <p className="text-sm text-neutral-500">
              Escolha como prefere começar sua experiência:
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-300 hover:border-neutral-400 rounded-2xl text-sm font-semibold text-neutral-700 transition-all shadow-xs cursor-pointer disabled:opacity-60"
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

            <p className="text-[11px] text-neutral-400 text-center">
              Você poderá conectar o Google Calendar separadamente depois.
            </p>

            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-neutral-400 font-medium">
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
              className="font-bold border-2 border-neutral-300 hover:border-orange-500 text-neutral-800 hover:text-orange-600 rounded-2xl py-3.5"
            >
              Continuar com e-mail
            </Button>
          </div>

          <div className="pt-4 border-t border-neutral-100 text-center text-sm text-neutral-500">
            Já possui uma conta?{' '}
            <Link to="/auth/login" className="font-bold text-orange-600 hover:text-orange-700 hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900">
              Pet<span className="text-orange-500">Hub</span>
            </span>
          </div>

          {step === 1 && (
            <button
              type="button"
              onClick={() => setRegMethod('choose')}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={14} /> Outras opções
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progressValue} size="sm" color="orange" />
          <p className="text-xs text-neutral-400 mt-2 text-right">
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
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Como você quer usar o PetHub?</h2>
              <p className="text-neutral-500 mb-6">Selecione o perfil que melhor descreve você</p>

              <div className="space-y-3 mb-8">
                {roleOptions.map((opt) => (
                  <div
                    key={opt.role}
                    onClick={() => setSelectedRole(opt.role)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedRole === opt.role
                        ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900">{opt.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                    </div>
                    {selectedRole === opt.role && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
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
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Dados da Conta</h2>
              <p className="text-neutral-500 mb-6">Preencha suas informações para criar a conta</p>

              {selectedRole !== 'tutor' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl mb-6 flex items-start gap-3">
                  <span className="text-xl">⏳</span>
                  <p className="text-xs text-amber-900 leading-relaxed">
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
                  label="Celular / WhatsApp *"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone size={16} />}
                  placeholder="(14) 99999-9999"
                  required
                />

                {selectedRole === 'estabelecimento' && (
                  <Input
                    label="CNPJ ou CPF do Responsável *"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    required
                  />
                )}

                {/* Professional Fields */}
                {selectedRole === 'profissional' && (
                  <>
                    <Input
                      label="CPF / Registro Profissional (ex: CRMV) *"
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      placeholder="000.000.000-00 ou CRMV-SP 12345"
                      required
                    />

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                        Especialidade / Atuação Principal *
                      </label>
                      <select
                        value={profSpecialty}
                        onChange={(e) => setProfSpecialty(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm font-medium"
                      >
                        {professionalSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                        Biografia / Sobre Você (Opcional)
                      </label>
                      <textarea
                        value={profBio}
                        onChange={(e) => setProfBio(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none text-sm"
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
                {selectedRole === 'estabelecimento' ? 'Próximo: dados do estabelecimento' : (isLoading ? 'Criando conta...' : 'Criar conta')}
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
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Dados do Estabelecimento</h2>
              <p className="text-neutral-500 mb-6">Informe os dados e fotos do seu negócio em Ourinhos - SP</p>

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
                  <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                    Tipo de estabelecimento *
                  </label>
                  <select
                    value={establishmentType}
                    onChange={(e) => setEstablishmentType(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm font-medium"
                  >
                    {establishmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Mandatory Photos Section */}
                <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-neutral-900">
                        Fotos do Estabelecimento / Fachada *
                      </label>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Obrigatório enviar pelo menos 1 foto real para aprovação administrativa
                      </p>
                    </div>
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
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
                    className="w-full border-2 border-dashed border-orange-300 hover:border-orange-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-neutral-600 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                      <Camera size={20} />
                    </div>
                    <span className="text-sm font-bold text-neutral-800">
                      {isUploadingPhoto ? 'Enviando foto...' : 'Adicionar foto do estabelecimento'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Clique para abrir o explorador de arquivos (PNG, JPG, JPEG)
                    </span>
                  </button>

                  {/* Photos Preview Grid */}
                  {establishmentPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {establishmentPhotos.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-200 aspect-video bg-neutral-100">
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
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
                    <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">Cidade</label>
                    <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-700 text-sm font-bold">
                      {city}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">Estado</label>
                    <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-700 text-sm font-bold">
                      {state}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                    Descrição do Estabelecimento (Opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none text-sm"
                    rows={3}
                    placeholder="Conte sobre os serviços, especialidades e diferenciais do seu pet shop ou clínica..."
                  />
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleNext}
                isLoading={isLoading}
                disabled={!!cityError || isCepLoading || isUploadingPhoto}
                rightIcon={<ArrowRight size={18} />}
              >
                {isLoading ? 'Criando conta...' : 'Finalizar cadastro'}
              </Button>
            </motion.div>
          )}

          {/* STEP 4: Confirmation Screen */}
          {step === totalSteps && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
                🎉
              </div>

              {selectedRole === 'tutor' ? (
                <>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Conta criada!</h2>
                  <p className="text-neutral-500 mb-8">Bem-vindo ao PetHub! Sua conta de tutor está pronta.</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Cadastro recebido!</h2>
                  <p className="text-neutral-500 mb-6 text-sm">
                    {selectedRole === 'estabelecimento'
                      ? 'Seu cadastro de estabelecimento foi enviado para análise da equipe PetHub.'
                      : 'Seu cadastro profissional foi enviado para análise da equipe PetHub.'}
                  </p>
                  
                  <div className="bg-neutral-50 rounded-2xl p-5 mb-8 text-left space-y-3.5 border border-neutral-100">
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">Conta criada com sucesso</p>
                        <p className="text-xs text-neutral-500">Seus dados de acesso foram registrados no sistema.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        ⏳
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">Aguardando aprovação</p>
                        <p className="text-xs text-neutral-500">
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

        <p className="text-center mt-6 text-sm text-neutral-500">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-orange-500 font-semibold hover:text-orange-600">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
