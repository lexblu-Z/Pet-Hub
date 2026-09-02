import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, User, Mail, Phone, Lock, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input, Button, Progress } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

const roleOptions = [
  { role: 'tutor' as UserRole, emoji: '🐾', title: 'Tutor', desc: 'Quero cuidar do meu pet e agendar serviços' },
  { role: 'estabelecimento' as UserRole, emoji: '🏪', title: 'Estabelecimento', desc: 'Tenho um pet shop, clínica ou serviço pet' },
  { role: 'profissional' as UserRole, emoji: '👨‍⚕️', title: 'Profissional', desc: 'Sou veterinário, tosador, adestrador ou passeador' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('tutor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) {
      if (!name || !email || !phone || !password || !confirmPassword) {
        toast.error('Preencha todos os campos');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }
      setStep(3);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    login(selectedRole);
    toast.success('Conta criada com sucesso! Bem-vindo ao PetHub! 🐾');
    
    if (selectedRole === 'tutor') {
      navigate('/auth/onboarding');
    } else {
      navigate(`/${selectedRole}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-neutral-900">Pet<span className="text-orange-500">Hub</span></span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={(step / 3) * 100} color="orange" size="sm" />
          <div className="flex justify-between mt-2 text-xs text-neutral-400">
            <span className={step >= 1 ? 'text-orange-500 font-medium' : ''}>Tipo de conta</span>
            <span className={step >= 2 ? 'text-orange-500 font-medium' : ''}>Seus dados</span>
            <span className={step >= 3 ? 'text-orange-500 font-medium' : ''}>Confirmação</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Criar conta grátis</h2>
              <p className="text-neutral-500 mb-6">Como você vai usar o PetHub?</p>
              <div className="space-y-3 mb-8">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.role}
                    onClick={() => setSelectedRole(opt.role)}
                    className={[
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left',
                      selectedRole === opt.role
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white',
                    ].join(' ')}
                  >
                    <span className="text-3xl shrink-0">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900">{opt.title}</p>
                      <p className="text-sm text-neutral-500">{opt.desc}</p>
                    </div>
                    {selectedRole === opt.role && (
                      <CheckCircle2 size={20} className="text-orange-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <Button fullWidth size="lg" onClick={handleNext} rightIcon={<ArrowRight size={18} />}>
                Continuar
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-6 transition-colors">
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Seus dados</h2>
              <p className="text-neutral-500 mb-6">Preencha suas informações para criar a conta</p>
              <div className="space-y-4 mb-8">
                <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} leftIcon={<User size={16} />} placeholder="Leonardo Silva" />
                <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} placeholder="seu@email.com" />
                <Input label="Telefone / WhatsApp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone size={16} />} placeholder="(14) 99123-4567" />
                <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={16} />} placeholder="Mínimo 8 caracteres" />
                <Input label="Confirmar senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} leftIcon={<Lock size={16} />} placeholder="Repita a senha" />
              </div>
              <Button fullWidth size="lg" onClick={handleNext} rightIcon={<ArrowRight size={18} />}>
                Criar conta
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-7xl mb-6"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Quase lá!</h2>
              <p className="text-neutral-500 mb-8">
                Enviamos um e-mail de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <div className="bg-neutral-50 rounded-2xl p-4 mb-8 text-left space-y-3">
                <div className="flex gap-2 items-start">
                  <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-neutral-600">Conta criada como <strong>{roleOptions.find(r => r.role === selectedRole)?.title}</strong></p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-neutral-600">E-mail de verificação enviado para <strong>{email}</strong></p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-amber-500 shrink-0 mt-0.5">⏳</span>
                  <p className="text-sm text-neutral-600">Aguardando confirmação do e-mail</p>
                </div>
              </div>
              <Button fullWidth size="lg" isLoading={isLoading} onClick={handleFinish}>
                Acessar plataforma
              </Button>
              <p className="mt-4 text-sm text-neutral-400">
                Não recebeu?{' '}
                <button className="text-orange-500 hover:underline">Reenviar e-mail</button>
              </p>
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
