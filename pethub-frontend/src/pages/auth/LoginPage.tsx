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
          <p className="text-neutral-500 mb-8">Entre na sua conta para continuar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail / Usuário (Admin)"
              type="text"
              placeholder="seu@email.com ou admin"
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
