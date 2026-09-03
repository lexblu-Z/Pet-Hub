import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Button, Input, Card } from '@/components/ui';

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
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
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft size={18} className="text-neutral-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            Segurança
          </h1>
          <p className="text-sm text-neutral-500">Atualize sua senha de acesso</p>
        </div>
      </div>

      <Card padding="lg" className="border border-neutral-100">
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl mb-6 border border-green-200">
            <CheckCircle className="text-green-500 shrink-0" size={20} />
            <p className="text-sm text-green-800 font-medium">Senha alterada com sucesso!</p>
          </div>
        )}

        <h2 className="text-base font-bold text-neutral-900 mb-5">Alterar senha</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Sua senha atual"
            leftIcon={<Lock size={16} />}
          />

          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            leftIcon={<Lock size={16} />}
          />

          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            leftIcon={<Lock size={16} />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
