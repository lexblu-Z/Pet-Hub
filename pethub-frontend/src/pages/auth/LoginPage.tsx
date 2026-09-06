import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Mail, Lock, ArrowRight, ArrowLeft, KeyRound, Sparkles, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Input, Button } from '@/components/ui';
import type { UserRole } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [noPasswordAlert, setNoPasswordAlert] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Email OTP states (Resend)
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('password');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const { login } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // OTP Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_denied') {
      toast.error('Autorização do Google cancelada ou negada.');
    } else if (errorParam === 'google_auth_failed') {
      toast.error('Erro na autenticação com o Google. Tente novamente.');
    } else if (errorParam === 'no_email') {
      toast.error('Não foi possível obter o e-mail da sua conta Google.');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await api.get('/auth/google/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Não foi possível obter a URL de login do Google.');
      }
    } catch (err: any) {
      toast.error('Erro ao conectar com o serviço do Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setEmailError('Informe um endereço de e-mail válido para receber o código.');
      toast.error('Informe um endereço de e-mail válido para receber o código.');
      return;
    }
    setEmailError(null);
    setIsOtpSending(true);
    try {
      const res = await api.post('/auth/otp/send', { email: cleanEmail });
      toast.success(res.data?.message || 'Código de acesso enviado! Verifique seu e-mail.');
      setOtpStep('code');
      setOtpCooldown(60);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao enviar código por e-mail.';
      toast.error(msg);
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('O código de verificação deve conter 6 dígitos.');
      return;
    }
    setIsOtpVerifying(true);
    try {
      const res = await api.post('/auth/otp/verify', {
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
      });

      if (res.data?.isNewUser) {
        toast.success('Código confirmado! Vamos concluir seu cadastro.');
        navigate(
          `/auth/select-role?regToken=${encodeURIComponent(res.data.regToken)}&email=${encodeURIComponent(
            res.data.email
          )}&source=otp`
        );
      } else {
        const { token, user } = res.data;
        const roleRouteMap: Record<string, string> = {
          TUTOR: 'tutor',
          ESTABLISHMENT: 'estabelecimento',
          PROFESSIONAL: 'profissional',
          ADMIN: 'admin',
        };
        const frontRole = (roleRouteMap[user.role] || user.role.toLowerCase()) as UserRole;
        login(token, user, frontRole);
        toast.success(`Bem-vindo de volta, ${user.name}! 🐾`);
        navigate(`/${frontRole}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Código incorreto ou expirado.';
      toast.error(msg);
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoPasswordAlert(null);

    const cleanIdentifier = email.trim();
    if (!cleanIdentifier) {
      setEmailError('Informe seu e-mail ou usuário.');
      toast.error('Informe seu e-mail ou usuário.');
      return;
    }
    setEmailError(null);

    if (!password) {
      toast.error('Informe sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: cleanIdentifier.toLowerCase(),
        password,
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

      toast.success('Bem-vindo de volta! 🐶');
      navigate(`/${frontRole}`);
    } catch (error: any) {
      console.error(error);
      if (error.response?.data?.code === 'NO_PASSWORD_SET' || error.response?.data?.noPassword) {
        const errorMsg =
          error.response.data.error ||
          'Você ainda não possui uma senha cadastrada. Acesse por código de e-mail ou use "Esqueci minha senha" para criar uma senha.';
        setNoPasswordAlert(errorMsg);
        toast.error(errorMsg);
      } else {
        const message = error.response?.data?.error || 'E-mail ou senha incorretos.';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 bg-neutral-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Pet<span className="text-orange-400">Hub</span></span>
        </div>
        <div className="relative z-10 space-y-6">
          <p className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Cuide do seu pet com{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              amor e tecnologia
            </span>
          </p>
          <p className="text-white/60 text-base max-w-md">
            Agendamentos inteligentes, saúde, vacinas, produtos e cashback em um só lugar.
          </p>

          {/* Real Animals Composition Card */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 flex items-center gap-3 transition-transform hover:scale-[1.02]">
              <img
                src="/premium-golden.jpg"
                alt="Golden Retriever"
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">Thor & Luna</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Vacinas em dia
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 flex items-center gap-3 transition-transform hover:scale-[1.02]">
              <img
                src="/romeu_e_julieta_1788367558045.jpg"
                alt="Cão e Gato"
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">Mel & Bob</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-orange-300 font-medium">
                  ⭐ 4.9 Tutor VIP
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-2 overflow-hidden">
              <img src="/jorginho_derpy_shepherd_1788367498390.jpg" alt="" className="inline-block h-8 w-8 rounded-full ring-2 ring-neutral-900 object-cover" />
              <img src="/beicinho_pitbull_1788367520420.jpg" alt="" className="inline-block h-8 w-8 rounded-full ring-2 ring-neutral-900 object-cover" />
              <img src="/brutus_buff_bulldog_1788367509463.jpg" alt="" className="inline-block h-8 w-8 rounded-full ring-2 ring-neutral-900 object-cover" />
              <img src="/salsicha_borzoi_1788367580508.jpg" alt="" className="inline-block h-8 w-8 rounded-full ring-2 ring-neutral-900 object-cover" />
            </div>
            <p className="text-xs text-white/50">
              Mais de <span className="text-orange-400 font-bold">+2.500 pets</span> cadastrados e felizes
            </p>
          </div>
        </div>
        <p className="relative text-white/20 text-sm">© 2026 PetHub</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <PawPrint size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900">Pet<span className="text-orange-500">Hub</span></span>
          </div>

          <h2 className="text-3xl font-bold text-neutral-900 mb-2">Bem-vindo de volta! 👋</h2>
          <p className="text-neutral-500 mb-6">Entre na sua conta para continuar</p>


          {/* Auth Method Selector */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-2xl border border-neutral-200/70 mb-6">
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMethod === 'password'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Lock size={14} />
              <span>Senha</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setOtpStep('email'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMethod === 'otp'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Mail size={14} />
              <span>Código por E-mail</span>
            </button>
          </div>

          {/* FORM: PASSWORD METHOD */}
          {authMethod === 'password' && (
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              {noPasswordAlert && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed">{noPasswordAlert}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 pl-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('otp');
                        setOtpStep('email');
                        setNoPasswordAlert(null);
                      }}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Acessar por código
                    </button>
                    <Link
                      to={`/auth/forgot-password?email=${encodeURIComponent(email)}`}
                      className="text-orange-600 hover:text-orange-700 font-bold underline text-[11px]"
                    >
                      Criar uma senha
                    </Link>
                  </div>
                </div>
              )}

              <Input
                label="E-mail ou usuário"
                type="text"
                autoComplete="username"
                placeholder="Digite seu e-mail ou usuário"
                value={email}
                error={emailError || undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (noPasswordAlert) setNoPasswordAlert(null);
                }}
                leftIcon={<User size={16} />}
                required
              />

              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (noPasswordAlert) setNoPasswordAlert(null);
                }}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />

              <div className="flex justify-end">
                <Link
                  to={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                size="lg"
                rightIcon={<ArrowRight size={18} />}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
              >
                Entrar
              </Button>
            </form>
          )}

          {/* FORM: OTP METHOD */}
          {authMethod === 'otp' && (
            <div>
              {otpStep === 'email' ? (
                <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                  <Input
                    label="E-mail de Acesso"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    error={emailError || undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    leftIcon={<Mail size={16} />}
                    required
                  />
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Enviaremos um código de verificação temporário de 6 dígitos para o seu e-mail. Sem complicação com senhas.
                  </p>
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isOtpSending}
                    size="lg"
                    rightIcon={<ArrowRight size={18} />}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  >
                    Enviar código de acesso
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center space-y-1.5 p-3 bg-neutral-50 border border-neutral-200/80 rounded-2xl">
                    <p className="text-xs text-neutral-500">
                      Código de 6 dígitos enviado para:
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900">{email}</span>
                      <button
                        type="button"
                        onClick={() => { setOtpStep('email'); setOtpCode(''); }}
                        className="text-[11px] text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2 text-center">
                      Digite o código de 6 dígitos recebido:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3.5 px-4 bg-white border-2 border-neutral-300 focus:border-orange-500 rounded-2xl outline-none transition-all text-neutral-900 shadow-xs"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isOtpVerifying}
                    disabled={otpCode.length !== 6}
                    size="lg"
                    rightIcon={<ArrowRight size={18} />}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
                  >
                    Confirmar e entrar
                  </Button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => { setOtpStep('email'); setOtpCode(''); }}
                      className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>

                    {otpCooldown > 0 ? (
                      <span className="text-neutral-400 font-medium">
                        Reenviar código em <strong>{otpCooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpSending}
                        className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                      >
                        Reenviar código
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Botão Google - Diretamente abaixo do botão Entrar */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full mt-[18px] flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
          >
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
            <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Continuar com Google'}</span>
          </button>

          <p className="text-center mt-6 text-sm text-neutral-500">
            Não tem conta?{' '}
            <Link to="/auth/register" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
