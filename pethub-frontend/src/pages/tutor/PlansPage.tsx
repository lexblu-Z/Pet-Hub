import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Shield, Gift } from 'lucide-react';
import { Button } from '@/components/ui';
import { availablePlans, userPlans } from '@/data/plans';
import { useToast } from '@/store/toastStore';
import { PlanPixModal } from '@/components/shared/PlanPixModal';

export default function PlansPage() {
  const toast = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const userPlan = userPlans.length > 0 ? userPlans[0] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">Planos PetHub</h1>
        <p className="text-neutral-500 dark:text-[#8E918F] max-w-lg mx-auto">Economize e garanta o melhor cuidado para o seu pet com nossos planos de assinatura mensais.</p>
      </div>

      {userPlan && userPlan.status === 'active' && (
        <div className="mb-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-orange-100 text-sm font-medium mb-1">Seu plano atual</p>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="fill-current" size={24} /> 
              {availablePlans.find(p => p.id === userPlan.planId)?.name}
            </h2>
            <p className="text-orange-100 text-sm mt-2">Ativo até {new Date(userPlan.nextRenewal).toLocaleDateString('pt-BR')}</p>
          </div>
          <Button variant="secondary" className="bg-white text-orange-600 hover:bg-orange-50 dark:bg-[#1E1F20] dark:text-orange-400 dark:hover:bg-[#282A2C]">Gerenciar Plano</Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {availablePlans.map((plan, i) => {
          const isPopular = plan.name === 'Plano Premium';
          return (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`relative bg-white dark:bg-[#1E1F20] rounded-3xl border-2 p-6 flex flex-col transition-all ${
                isPopular 
                  ? 'border-orange-500 shadow-xl shadow-orange-500/10 dark:shadow-orange-500/5 scale-105 z-10' 
                  : 'border-neutral-100 dark:border-[#313335] shadow-sm'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                  Mais Popular
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-2">{plan.name}</h3>
                <div className="flex justify-center items-end gap-1 mb-2">
                  <span className="text-lg font-bold text-neutral-400 dark:text-[#8E918F]">R$</span>
                  <span className="text-4xl font-bold text-neutral-900 dark:text-[#E3E3E3]">{plan.price}</span>
                  <span className="text-neutral-500 dark:text-[#8E918F] text-sm mb-1">/mês</span>
                </div>
                <p className="text-sm text-neutral-500 dark:text-[#8E918F]">Plano Oficial PetHub</p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.benefits.map((benefit, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Check size={18} className="text-orange-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-neutral-700 dark:text-[#C4C7C5] leading-tight">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                fullWidth 
                variant={isPopular ? 'primary' : 'outline'}
                onClick={() => {
                  setSelectedPlan(plan);
                  setIsPixModalOpen(true);
                }}
              >
                Simular {plan.name}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <PlanPixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        plan={selectedPlan}
        onSuccess={() => {
          toast.success('Plano simulado com sucesso!');
        }}
      />
    </div>
  );
}
