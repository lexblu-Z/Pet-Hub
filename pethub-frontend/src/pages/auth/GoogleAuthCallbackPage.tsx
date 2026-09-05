import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import type { UserRole } from '@/types';

export default function GoogleAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Não foi possível autenticar com o Google.');
      navigate('/auth/login');
      return;
    }

    if (!token) {
      navigate('/auth/login');
      return;
    }

    const processLogin = async () => {
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;
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
      } catch (err: any) {
        console.error('Google callback error:', err);
        toast.error('Falha ao autenticar com o Google. Tente novamente.');
        navigate('/auth/login');
      }
    };

    processLogin();
  }, [searchParams, navigate, login, toast]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-neutral-800">Conectando ao PetHub...</h2>
        <p className="text-sm text-neutral-500">Estamos validando seu acesso com o Google com segurança.</p>
      </div>
    </div>
  );
}
