import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownLeft, ArrowUpRight, Copy, HelpCircle, CheckCircle2, 
  DollarSign, X, Sparkles, AlertCircle, Coins, Tag, Clock, ShieldCheck 
} from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

interface CashbackTx {
  id: string;
  amount: number;
  type: 'EARNED' | 'REDEEMED';
  originType?: string | null;
  rate?: number | null;
  eligibleAmount?: number | null;
  description: string;
  code?: string | null;
  createdAt: string;
}

interface ActiveVoucher {
  id: string;
  code: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function CashbackPage() {
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0);
  const [transactions, setTransactions] = useState<CashbackTx[]>([]);
  const [activeVouchers, setActiveVouchers] = useState<ActiveVoucher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    fetchCashback();
  }, []);

  const fetchCashback = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/cashback/me');
      setBalance(res.data.balance || 0);
      setTotalEarned(res.data.totalEarned || 0);
      setTotalRedeemed(res.data.totalRedeemed || 0);
      setTransactions(res.data.transactions || []);
      setActiveVouchers(res.data.activeVouchers || []);
    } catch (error) {
      console.error('Error fetching cashback:', error);
      setBalance(0);
      setTotalEarned(0);
      setTotalRedeemed(0);
      setTransactions([]);
      setActiveVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!', 'Use este código no checkout de compras ou na revisão de agendamentos.');
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(redeemAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Informe um valor válido para resgate.');
      return;
    }
    if (amountNum > balance) {
      toast.error(`Saldo insuficiente. Seu saldo disponível é R$ ${balance.toFixed(2).replace('.', ',')}`);
      return;
    }

    try {
      setIsRedeeming(true);
      const res = await api.post('/cashback/redeem', { amount: amountNum });
      setGeneratedCode(res.data.code);
      setBalance(res.data.remainingBalance);
      toast.success('Cupom de cashback gerado com sucesso!');
      fetchCashback();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao realizar resgate');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Meu Cashback</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm">
            Ganhe 3% em produtos e 5% em agendamentos de volta em todas as suas transações
          </p>
        </div>
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200/50 dark:border-orange-900/40 px-3.5 py-2 rounded-2xl transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <HelpCircle size={16} />
          <span>Regras e Funcionamento</span>
        </button>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance - Primary Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/15 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full translate-y-16 -translate-x-16 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Decorative Element with real insp12 asset */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/insp12.jpg"
                alt="Economize cuidando do seu amigão"
                className="w-11 h-11 rounded-full object-cover border-2 border-orange-400 shrink-0 shadow-xs"
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  Economize cuidando do seu amigão
                </p>
                <p className="text-[11px] text-white/70 truncate">
                  Cashback garantido em cada serviço, consulta e produto
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Saldo Disponível para Resgate
              </span>
              <span className="text-[10px] bg-white/10 text-orange-300 font-semibold px-2 py-0.5 rounded-full">
                Universal PetHub
              </span>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-orange-400 tracking-tight my-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
            </p>
            <p className="text-xs text-white/60 mb-6">
              Resgate seu saldo em cupons exclusivos para abater em novos agendamentos e compras.
            </p>
          </div>

          <div className="relative z-10 flex gap-3">
            <Button
              size="sm"
              disabled={balance <= 0}
              onClick={() => {
                setRedeemAmount(balance.toFixed(2));
                setGeneratedCode(null);
                setIsRedeemOpen(true);
              }}
            >
              Resgatar em Cupom
            </Button>
          </div>
        </motion.div>

        {/* Secondary Cumulative Stats */}
        <div className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-white dark:bg-[#1E1F20] rounded-3xl p-5 border border-neutral-100 dark:border-[#313335] shadow-xs flex flex-col justify-center"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
              <ArrowDownLeft size={16} />
              <span>Total Já Ganho</span>
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEarned)}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
              Acumulado desde o início da conta
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 bg-white dark:bg-[#1E1F20] rounded-3xl p-5 border border-neutral-100 dark:border-[#313335] shadow-xs flex flex-col justify-center"
          >
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase mb-1">
              <ArrowUpRight size={16} />
              <span>Total Já Resgatado</span>
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-[#E3E3E3]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRedeemed)}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
              Economia revertida em compras e serviços
            </p>
          </motion.div>
        </div>
      </div>

      {/* Active Vouchers Section */}
      {activeVouchers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
              <Tag size={18} className="text-orange-500" />
              <span>Seus Cupons de Desconto Ativos ({activeVouchers.length})</span>
            </h2>
            <span className="text-xs text-neutral-400">Prontos para uso</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeVouchers.map((v) => (
              <div
                key={v.id}
                className="p-4 bg-orange-50/60 dark:bg-[#282A2C] border border-orange-200/80 dark:border-[#313335] rounded-2xl flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-neutral-900 dark:text-[#E3E3E3] tracking-wide">
                      {v.code}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Ativo
                    </span>
                  </div>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">
                    Desconto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.amount)}
                  </p>
                  <p className="text-[10px] text-neutral-400 dark:text-[#8E918F]">
                    Criado em {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(v.code)}
                  className="px-3 py-2 bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] hover:border-orange-500 rounded-xl text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                  title="Copiar código"
                >
                  <Copy size={13} />
                  <span>Copiar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Section */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Extrato de Movimentações</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-neutral-100 dark:bg-[#282A2C] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-8 border border-neutral-100 dark:border-[#313335] text-center shadow-xs">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-500">
              <Coins size={28} />
            </div>
            <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">Nenhum cashback registrado ainda</h3>
            <p className="text-neutral-400 dark:text-[#8E918F] text-xs max-w-sm mx-auto">
              Realize agendamentos de serviços ou compras em estabelecimentos parceiros para acumular cashback automaticamente após a confirmação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'EARNED';
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-xs"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  }`}>
                    {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3] text-sm truncate">{tx.description}</p>
                      {tx.originType && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]">
                          {tx.originType === 'SERVICE' ? 'Serviço 5%' : 'Produto 3%'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-400 dark:text-[#8E918F]">
                        {new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {tx.code && (
                        <span className="text-[11px] font-mono font-bold bg-neutral-100 dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] px-2 py-0.5 rounded border border-transparent dark:border-[#313335]">
                          {tx.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-[#E3E3E3]'}`}>
                      {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                    </p>
                    {tx.eligibleAmount !== undefined && tx.eligibleAmount !== null && isCredit && (
                      <p className="text-[10px] text-neutral-400">
                        sobre R$ {tx.eligibleAmount.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works Modal */}
      <Modal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        title="Como funciona o Cashback PetHub"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-[#C4C7C5] leading-relaxed">
            O programa de cashback universal do PetHub premia tutores em todas as compras e agendamentos confirmados:
          </p>

          <div className="space-y-3 pt-1">
            {[
              {
                step: '1',
                title: 'Compras de Produtos (3%)',
                desc: 'Receba 3% de cashback sobre o valor líquido pago ao confirmar o recebimento do pedido.',
              },
              {
                step: '2',
                title: 'Agendamentos de Serviços (5%)',
                desc: 'Receba 5% de cashback sobre o valor do serviço concluído quando você confirmar a realização.',
              },
              {
                step: '3',
                title: 'Resgate em Cupom Seguro',
                desc: 'Converta qualquer valor do seu saldo disponível em um código criptográfico intransferível (PHB-XXXX-XXXX-XXXX).',
              },
              {
                step: '4',
                title: 'Aplique em Novas Compras ou Serviços',
                desc: 'Insira o código no checkout ou revisão de agendamento para obter desconto imediato sobre o subtotal.',
              },
              {
                step: '5',
                title: 'Transparência e Segurança Total',
                desc: 'Seu saldo é protegido contra fraudes, e cupons não utilizados em pedidos cancelados são restaurados automaticamente.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3 p-3.5 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl border border-neutral-100 dark:border-[#313335]">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {step}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3]">{title}</h4>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] flex justify-end">
            <Button onClick={() => setIsHowItWorksOpen(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Redeem Modal */}
      <Modal
        isOpen={isRedeemOpen}
        onClose={() => {
          setIsRedeemOpen(false);
          setGeneratedCode(null);
        }}
        title="Resgatar Saldo de Cashback"
        size="sm"
      >
        {generatedCode ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">Cupom Gerado com Sucesso!</h3>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-1">
                Insira este código na tela de pagamento para abater do valor final.
              </p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center justify-between gap-3">
              <span className="text-base font-mono font-extrabold text-orange-600 dark:text-orange-400 tracking-wider">
                {generatedCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(generatedCode)}
                className="flex items-center gap-1 text-xs font-bold text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-white bg-white dark:bg-[#1E1F20] px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50 shadow-xs cursor-pointer"
              >
                <Copy size={13} />
                Copiar
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
              Este código é único, vinculado à sua conta e já está disponível na sua lista de cupons ativos.
            </p>

            <Button fullWidth onClick={() => setIsRedeemOpen(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
              Saldo disponível: <strong className="text-neutral-800 dark:text-[#E3E3E3]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</strong>
            </p>

            <Input
              label="Valor a resgatar (R$)"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder="0,00"
              leftIcon={<DollarSign size={16} />}
              required
            />

            <div className="flex gap-2">
              {[5, 10, 20, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={val > balance}
                  onClick={() => setRedeemAmount(String(val))}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-[#E3E3E3] hover:bg-neutral-50 dark:hover:bg-[#282A2C] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  R$ {val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRedeemAmount(balance.toFixed(2))}
                className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-100 dark:hover:bg-orange-900/50 cursor-pointer"
              >
                Tudo
              </button>
            </div>

            <div className="pt-3 flex gap-2">
              <Button type="submit" fullWidth isLoading={isRedeeming}>
                Confirmar Resgate
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsRedeemOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
