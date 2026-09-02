import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Mail, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Digite seu e-mail'); return; }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-neutral-900">Pet<span className="text-orange-500">Hub</span></span>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Esqueceu a senha?</h2>
              <p className="text-neutral-500 mb-8">Informe seu e-mail e enviaremos as instruções para redefinir sua senha.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} placeholder="seu@email.com" />
                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>Enviar instruções</Button>
              </form>
              <div className="mt-6 text-center">
                <Link to="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
                  <ArrowLeft size={16} /> Voltar para o login
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="text-7xl mb-6">📬</div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">E-mail enviado!</h2>
              <p className="text-neutral-500 mb-8">Enviamos as instruções para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.</p>
              <Link to="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">
                <ArrowLeft size={16} /> Voltar para o login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const strength = password.length >= 8 ? (password.match(/[A-Z]/) && password.match(/[0-9]/) ? 'strong' : 'medium') : password.length > 0 ? 'weak' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Senhas não coincidem'); return; }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setDone(true);
    setIsLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="text-7xl mb-6">✅</motion.div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Senha redefinida!</h2>
          <p className="text-neutral-500 mb-8">Sua senha foi alterada com sucesso. Agora você pode fazer login.</p>
          <Button onClick={() => navigate('/auth/login')} fullWidth size="lg">Ir para o login</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
            <PawPrint size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-neutral-900">Pet<span className="text-orange-500">Hub</span></span>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Nova senha</h2>
        <p className="text-neutral-500 mb-8">Digite sua nova senha abaixo.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Nova senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={16} />} placeholder="Mínimo 8 caracteres" />
            {strength && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {['weak', 'medium', 'strong'].map((s) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full ${
                      (strength === 'weak' && s === 'weak') ? 'bg-red-400' :
                      (strength === 'medium' && (s === 'weak' || s === 'medium')) ? 'bg-amber-400' :
                      (strength === 'strong') ? 'bg-green-400' : 'bg-neutral-200'
                    }`} />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-amber-500' : 'text-green-500'}`}>
                  {strength === 'weak' ? 'Fraca' : strength === 'medium' ? 'Média' : 'Forte'}
                </span>
              </div>
            )}
          </div>
          <Input label="Confirmar senha" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} leftIcon={<Lock size={16} />} placeholder="Repita a nova senha" />
          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>Redefinir senha</Button>
        </form>
      </motion.div>
    </div>
  );
}
