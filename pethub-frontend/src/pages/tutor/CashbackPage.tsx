import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDownLeft, ArrowUpRight, Copy, CheckCircle2 } from 'lucide-react';
import { cashbackBalance, cashbackTransactions } from '@/data/cashback';
import { Button } from '@/components/ui';
import { useToast } from '@/store/toastStore';

export default function CashbackPage() {
  const toast = useToast();
  
  const handleCopyCode = () => {
    toast.success('Código copiado!', 'Cole no checkout do estabelecimento.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Meu Cashback</h1>
        <p className="text-neutral-500 text-sm">Ganhe dinheiro de volta a cada serviço</p>
      </div>

      {/* Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden mb-8 shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full translate-y-16 -translate-x-16 blur-2xl" />
        
        <div className="relative flex items-center justify-between z-10">
          <div>
            <p className="text-white/60 text-sm font-medium mb-1 uppercase tracking-wider">Saldo disponível</p>
            <p className="text-5xl font-bold text-orange-400 mb-6">
              R$ {cashbackBalance.available.toFixed(2)}
            </p>
            
            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl shrink-0">⏳</div>
              <div>
                <p className="text-sm font-medium text-white/90">Saldo pendente</p>
                <p className="text-lg font-bold text-white">R$ {cashbackBalance.pending.toFixed(2)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-white/50 leading-tight max-w-[100px]">Libera em até 30 dias após o serviço</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center ml-6">
            <img 
              src="/brutus_buff_bulldog_1788367509463.jpg" 
              alt="Brutus forte" 
              className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full border-4 border-white/10 shadow-2xl" 
            />
            <p className="text-xs text-white/50 mt-3 font-medium italic">"Seu saldo tá monstro, pai!"</p>
          </div>
        </div>
      </motion.div>

      {/* How to use */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-8">
        <h2 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span> Como usar seu saldo?
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm font-bold text-neutral-900 mb-1">Pagamento no app</p>
            <p className="text-xs text-neutral-500">O desconto é aplicado automaticamente no carrinho na hora de finalizar o agendamento.</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-neutral-900 mb-1">Pagamento presencial</p>
              <p className="text-xs text-neutral-500 mb-3">Apresente este código no balcão do estabelecimento.</p>
            </div>
            <button onClick={handleCopyCode} className="flex items-center justify-between px-3 py-2 bg-neutral-100 rounded-lg text-sm font-mono font-bold text-neutral-700 hover:bg-neutral-200 transition-colors">
              PETHUB-CASH-4750
              <Copy size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-bold text-neutral-900 mb-4">Histórico</h2>
      <div className="space-y-3">
        {cashbackTransactions.map((tx, i) => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              tx.type === 'credit' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
            }`}>
              {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate">{tx.description}</p>
              <p className="text-xs text-neutral-400">
                {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                {tx.description.includes('pendente') && <span className="ml-2 text-amber-500 font-medium">⏳ Pendente</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-neutral-900'}`}>
                {tx.type === 'credit' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
