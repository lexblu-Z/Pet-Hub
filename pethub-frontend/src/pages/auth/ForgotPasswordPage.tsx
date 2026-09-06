import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Mail, ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const toast = useToast();
  const navigate = useNavigate();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error('Informe seu e-mail cadastrado.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error('Informe um endereço de e-mail válido (ex: seu@email.com).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      toast.success(res.data?.message || 'Código de 6 dígitos enviado! Verifique seu e-mail.');
      setStep('code');
      setCooldown(60);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        'Não foi possível enviar o código de recuperação. Verifique o e-mail informado.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Digite o código de verificação de 6 dígitos.');
      return;
    }

    if (newPassword === '12345678') {
      toast.error('Que senha merda (●\'◡\'●) 💩 Faz uma senha boa aí man!');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      });

      toast.success(res.data?.message || 'Senha redefinida com sucesso!');
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao redefinir a senha. Verifique o código e tente novamente.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const strength =
    newPassword.length >= 8
      ? newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/)
        ? 'strong'
        : 'medium'
      : newPassword.length > 0
      ? 'weak'
      : '';

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-8 sm:p-10"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-xs">
            <PawPrint size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-neutral-900">
            Pet<span className="text-orange-500">Hub</span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* PASSO 1: INFORMAR E-MAIL */}
          {step === 'email' && (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold text-neutral-900">Esqueceu a senha? 🔐</h1>
                <p className="text-sm text-neutral-500">
                  Informe o e-mail da sua conta para receber um código seguro de 6 dígitos via Resend.
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="space-y-4">
                <Input
                  label="E-mail cadastrado"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={16} />}
                  placeholder="digite seu e-mail"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight size={18} />}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  Enviar código de recuperação
                </Button>
              </form>

              <div className="pt-2 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar para o login
                </Link>
              </div>
            </motion.div>
          )}

          {/* PASSO 2: DIGITAR CÓDIGO + NOVA SENHA */}
          {step === 'code' && (
            <motion.div
              key="step-code"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold text-neutral-900">Redefinir senha</h1>
                <p className="text-sm text-neutral-500">
                  Código de 6 dígitos enviado para:
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full text-xs font-semibold text-neutral-800">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                    }}
                    className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-2 text-center">
                    Digite o código de 6 dígitos recebido por e-mail:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3 px-4 bg-white border-2 border-neutral-300 focus:border-orange-500 rounded-2xl outline-none transition-all text-neutral-900 shadow-xs"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Nova senha"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock size={16} />}
                    placeholder="Mínimo de 6 caracteres"
                    required
                  />

                  {newPassword === '12345678' && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 animate-fade-in">
                      <p className="font-bold text-amber-900">Que senha merda (●'◡'●) 💩</p>
                      <p className="text-amber-800 font-medium">Faz uma senha boa aí man!</p>
                    </div>
                  )}

                  {strength && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {['weak', 'medium', 'strong'].map((s) => (
                          <div
                            key={s}
                            className={`flex-1 h-1.5 rounded-full transition-all ${
                              strength === 'weak' && s === 'weak'
                                ? 'bg-red-400'
                                : strength === 'medium' && (s === 'weak' || s === 'medium')
                                ? 'bg-amber-400'
                                : strength === 'strong'
                                ? 'bg-green-500'
                                : 'bg-neutral-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[11px] font-bold ${
                          strength === 'weak'
                            ? 'text-red-500'
                            : strength === 'medium'
                            ? 'text-amber-500'
                            : 'text-green-600'
                        }`}
                      >
                        {strength === 'weak' ? 'Fraca' : strength === 'medium' ? 'Média' : 'Forte'}
                      </span>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock size={16} />}
                  placeholder="Repita a nova senha"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={isLoading}
                  disabled={code.length !== 6 || newPassword.length < 6 || !confirmPassword}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
                >
                  Salvar nova senha
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                    }}
                    className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft size={14} /> Voltar
                  </button>

                  {cooldown > 0 ? (
                    <span className="text-neutral-400 font-medium">
                      Reenviar código em <strong>{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestCode()}
                      disabled={isLoading}
                      className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                    >
                      Reenviar código
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}

          {/* PASSO 3: SUCESSO */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-neutral-900">Senha alterada com sucesso! 🎉</h1>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Sua conta foi atualizada e sua nova senha já está ativa. Agora você pode entrar com total segurança.
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth/login')}
                fullWidth
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
              >
                Fazer login agora
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function ResetPasswordPage() {
  return <ForgotPasswordPage />;
}

