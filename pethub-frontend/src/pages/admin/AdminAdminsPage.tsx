import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

export default function AdminAdminsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    if (!name || !email || !password) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/admin/admins', { name, email, password });
      toast.success('Administrador criado com sucesso!');
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar administrador.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='p-6 max-w-2xl mx-auto'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-orange-500'>
          <UserPlus size={24} />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]'>Novo Administrador</h1>
          <p className='text-neutral-500 dark:text-[#8E918F]'>Crie contas com acesso total ao painel</p>
        </div>
      </div>

      <div className='bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-6 shadow-xs'>
        <div className='space-y-4 mb-6'>
          <Input 
            label='Nome completo' 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            leftIcon={<User size={18} />} 
          />
          <Input 
            label='E-mail corporativo' 
            type='email' 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            leftIcon={<Mail size={18} />} 
          />
          <Input 
            label='Senha provisória' 
            type='password' 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            leftIcon={<Lock size={18} />} 
          />
        </div>
        
        <div className='bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 p-4 rounded-xl mb-6'>
          <p className='text-sm text-orange-800 dark:text-orange-300'>
            <strong>Atenção:</strong> Esta conta terá controle total sobre a plataforma, incluindo aprovação de cadastros, visualização de métricas e criação de novos administradores.
          </p>
        </div>

        <Button fullWidth size='lg' onClick={handleCreate} disabled={isLoading}>
          {isLoading ? 'Criando...' : 'Criar Administrador'}
        </Button>
      </div>
    </div>
  );
}