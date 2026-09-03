import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PawPrint } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export default function WelcomePage() {
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    navigate('/auth/login', { state: { role } });
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center max-w-lg w-full"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/40">
            <PawPrint size={36} className="text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">
          Pet<span className="text-orange-400">Hub</span>
        </h1>
        <p className="text-white/50 mb-12">Como você quer acessar a plataforma?</p>

        <div className="space-y-4">
          {[
            { role: 'tutor' as UserRole, emoji: '🐾', title: 'Sou Tutor', desc: 'Quero cuidar do meu pet', color: 'from-orange-500 to-orange-600' },
            { role: 'estabelecimento' as UserRole, emoji: '🏪', title: 'Sou Estabelecimento', desc: 'Tenho um pet shop ou clínica', color: 'from-blue-500 to-blue-600' },
            { role: 'profissional' as UserRole, emoji: '👨‍⚕️', title: 'Sou Profissional', desc: 'Trabalho com pets', color: 'from-green-500 to-green-600' },
            { role: 'admin' as UserRole, emoji: '⚙️', title: 'Administrador', desc: 'Acesso admin PetHub', color: 'from-purple-500 to-purple-600' },
          ].map((item, i) => (
            <motion.button
              key={item.role}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect(item.role)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 text-left"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                {item.emoji}
              </div>
              <div>
                <p className="text-white font-semibold">{item.title}</p>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <p className="mt-8 text-white/30 text-sm">
          Não tem conta?{' '}
          <button onClick={() => navigate('/auth/register')} className="text-orange-400 hover:text-orange-300 transition-colors">
            Criar conta grátis
          </button>
        </p>
      </motion.div>
    </div>
  );
}
