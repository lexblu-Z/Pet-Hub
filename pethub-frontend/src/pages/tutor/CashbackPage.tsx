import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Copy, HelpCircle, CheckCircle2, DollarSign, X, Sparkles, AlertCircle } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

interface CashbackTx {
  id: string;
  amount: number;
  type: 'EARNED' | 'REDEEMED';
  description: string;
  code?: string;
  status: string;
  createdAt: string;
}

export default function CashbackPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CashbackTx[]>([]);
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
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching cashback:', error);
      setBalance(0);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!', 'Apresente no estabelecimento para utilizar seu desconto.');
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(redeemAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Informe um valor válido para resgate.');
      return;
    }
    if (amountNum > balance) {
      toast.error(`Saldo insuficiente. Seu saldo disponível é R$ ${balance.toFixed(2)}`);
      return;
    }

    try {
      setIsRedeeming(true);
      const res = await api.post('/cashback/redeem', { amount: amountNum });
      setGeneratedCode(res.data.code);
      setBalance(res.data.remainingBalance);
      toast.success('Código de resgate gerado com sucesso!');
      fetchCashback();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao realizar resgate');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Meu Cashback</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm">Receba parte do seu dinheiro de volta a cada compra ou agendamento</p>
        </div>
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200/50 dark:border-orange-900/40 px-3.5 py-2 rounded-2xl transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <HelpCircle size={16} />
          <span>Como funciona o cashback? Clique para saber mais</span>
        </button>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/15 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full translate-y-16 -translate-x-16 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Saldo disponível para resgate</span>
            <p className="text-4xl sm:text-5xl font-extrabold text-orange-400 mt-2 mb-4">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={balance <= 0}
                onClick={() => {
                  setRedeemAmount(balance.toFixed(2));
                  setGeneratedCode(null);
                  setIsRedeemOpen(true);
                }}
              >
                Resgatar Saldo
              </Button>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-center shrink-0">
            <img
              src="/brutus_buff_bulldog_1788367509463.jpg"
              alt="Mascote Cashback"
              className="w-28 h-28 object-cover rounded-full border-4 border-white/10 shadow-xl"
            />
            <p className="text-[11px] text-white/50 mt-2 font-medium italic text-center">
              "Economize cuidando do seu amigão!"
            </p>
          </div>
        </div>
      </motion.div>


      {/* History Section */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Histórico de Movimentações</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-neutral-100 dark:bg-[#282A2C] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-8 border border-neutral-100 dark:border-[#313335] text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🪙
            </div>
            <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">Nenhum cashback registrado ainda</h3>
            <p className="text-neutral-400 dark:text-[#8E918F] text-xs max-w-sm mx-auto">
              Realize agendamentos ou compras em estabelecimentos parceiros para acumular saldo de cashback automaticamente.
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
                  className="flex items-center gap-4 p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-green-50 dark:bg-emerald-950/40 text-green-600 dark:text-emerald-400' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  }`}>
                    {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-[#E3E3E3] text-sm truncate">{tx.description}</p>
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
                    <p className={`font-bold text-sm ${isCredit ? 'text-green-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-[#E3E3E3]'}`}>
                      {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* How to use Modal */}
      <Modal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        title="💡 Como funciona o Cashback PetHub"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-[#C4C7C5] leading-relaxed">
            O cashback do PetHub funciona de forma simples, transparente e sem pegadinhas. Veja o passo a passo:
          </p>

          <div className="space-y-3 pt-1">
            {[
              {
                step: '1',
                title: 'Escolha quanto deseja utilizar',
                desc: 'Clique em "Resgatar Saldo" e defina o valor desejado do seu saldo disponível.',
              },
              {
                step: '2',
                title: 'Confirme a utilização',
                desc: 'O sistema valida seu saldo e deduz o valor solicitado com segurança.',
              },
              {
                step: '3',
                title: 'Um código único será gerado',
                desc: 'Um código exclusivo de resgate (ex: CASH-7F2A-9B3E) será emitido instantaneamente.',
              },
              {
                step: '4',
                title: 'Apresente o código',
                desc: 'Informe o código ao estabelecimento parceiro no balcão ou durante o agendamento.',
              },
              {
                step: '5',
                title: 'Desconto aplicado',
                desc: 'O valor resgatado é descontado diretamente da sua conta conforme as regras da transação.',
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
            <div className="w-14 h-14 bg-green-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-green-500 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3]">Código gerado com sucesso!</h3>
              <p className="text-xs text-neutral-500 dark:text-[#8E918F] mt-1">Apresente este código no estabelecimento para obter seu desconto.</p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center justify-between gap-3">
              <span className="text-lg font-mono font-extrabold text-orange-600 dark:text-orange-400 tracking-wider">
                {generatedCode}
              </span>
              <button
                onClick={() => handleCopy(generatedCode)}
                className="flex items-center gap-1 text-xs font-bold text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-white bg-white dark:bg-[#1E1F20] px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50 shadow-sm cursor-pointer"
              >
                <Copy size={13} />
                Copiar
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
              Este código é único, intransferível e fica registrado no seu histórico.
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
