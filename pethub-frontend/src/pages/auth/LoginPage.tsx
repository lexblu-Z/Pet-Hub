import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PawPrint, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Input, Button } from '@/components/ui';
import type { UserRole } from '@/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setIsLoading(true);
    
    try {
      // API call to the backend
      const response = await api.post('/auth/login', {
        email,
        password,
        role: 'TUTOR', // Assuming default login form is for Tutor (we can improve this later)
      });
      
      const { token, user } = response.data;
      login(token, user, user.role.toLowerCase() as UserRole);
      
      toast.success('Bem-vindo de volta! 🐶');
      navigate(`/${user.role.toLowerCase()}`);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.error || 'Erro ao fazer login. O back-end está rodando?';
      toast.error(message);
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
        <div className="relative">
          <p className="text-5xl font-bold text-white mb-6 leading-tight">
            Cuide do seu pet com{' '}
            <span className="text-orange-400">amor e tecnologia</span>
          </p>
          <p className="text-white/50 text-lg">
            Acesse agendamentos, histórico de saúde, vacinas, cashback e muito mais.
          </p>
          <div className="mt-10 flex gap-4">
            {['🐕 Thor', '🐈 Luna', '🐕 Mel', '🐕 Bob'].map((pet) => (
              <span key={pet} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm">
                {pet}
              </span>
            ))}
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
          <p className="text-neutral-500 mb-8">Entre na sua conta para continuar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
            />
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-sm text-orange-500 hover:text-orange-600 transition-colors">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Entrar na conta
              <ArrowRight size={18} />
            </Button>
          </form>

          <p className="text-center mt-8 text-sm text-neutral-500">
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
