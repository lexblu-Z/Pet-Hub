import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { Button, Input, Card } from '@/components/ui';

export default function SecurityPage() {
  const { currentUser, setUser } = useAuthStore();
  const [hasPassword, setHasPassword] = useState<boolean>(currentUser?.hasPassword !== false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  // Load latest state from backend
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        if (res.data) {
          const userHasPass = res.data.hasPassword !== false;
          setHasPassword(userHasPass);
          if (currentUser) {
            setUser({ ...currentUser, hasPassword: userHasPass });
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPassword && !currentPassword) {
      toast.error('Informe sua senha atual.');
      return;
    }

    if (newPassword === '12345678') {
      toast.error('Que senha merda (●\'◡\'●) 💩 Faz uma senha boa aí man!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);
      const payload: any = { newPassword };
      if (hasPassword) {
        payload.currentPassword = currentPassword;
      }

      await api.put('/users/me/password', payload);
      setSuccess(true);
      setHasPassword(true);
      if (currentUser) {
        setUser({ ...currentUser, hasPassword: true });
      }

      const successMsg = hasPassword ? 'Senha alterada com sucesso!' : 'Senha cadastrada com sucesso!';
      toast.success(successMsg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Senha atual incorreta ou erro no servidor';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tutor/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-neutral-600 dark:text-[#E3E3E3]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            Segurança da Conta
          </h1>
          <p className="text-sm text-neutral-500 dark:text-[#8E918F]">
            {hasPassword ? 'Atualize sua senha de acesso' : 'Cadastre uma senha para sua conta'}
          </p>
        </div>
      </div>

      <Card padding="lg" className="border border-neutral-100 dark:border-[#313335]">
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-emerald-950/30 rounded-xl mb-6 border border-green-200 dark:border-emerald-900/50">
            <CheckCircle className="text-green-500 dark:text-emerald-400 shrink-0" size={20} />
            <p className="text-sm text-green-800 dark:text-emerald-300 font-medium">
              {hasPassword ? 'Senha atualizada com sucesso!' : 'Senha cadastrada com sucesso!'}
            </p>
          </div>
        )}

        {!hasPassword && (
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-2xl mb-6 border border-orange-200/80 dark:border-orange-900/50 text-xs text-orange-950 dark:text-orange-200">
            <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-orange-900 dark:text-orange-300">Você ainda não tem uma senha cadastrada</p>
              <p className="text-orange-800/90 dark:text-orange-200/80 leading-relaxed">
                Sua conta foi criada através do Google ou Código por E-mail. Crie uma senha abaixo para poder entrar também utilizando seu e-mail e senha com total praticidade.
              </p>
            </div>
          </div>
        )}

        <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3] mb-5">
          {hasPassword ? 'Alterar senha' : 'Cadastrar senha de acesso'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <Input
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Sua senha atual"
              leftIcon={<Lock size={16} />}
              required
            />
          )}

          <Input
            label={hasPassword ? 'Nova senha' : 'Senha desejada'}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            leftIcon={<Lock size={16} />}
            required
          />

          {newPassword === '12345678' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 animate-fade-in">
              <p className="font-bold text-amber-900">Que senha merda (●'◡'●) 💩</p>
              <p className="text-amber-800 font-medium">Faz uma senha boa aí man!</p>
            </div>
          )}

          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            leftIcon={<Lock size={16} />}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              disabled={(hasPassword && !currentPassword) || !newPassword || !confirmPassword}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {loading
                ? 'Salvando...'
                : hasPassword
                ? 'Atualizar senha'
                : 'Cadastrar senha'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
