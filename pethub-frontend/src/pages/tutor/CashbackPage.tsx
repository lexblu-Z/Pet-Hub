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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Meu Cashback</h1>
          <p className="text-neutral-500 text-sm">Receba parte do seu dinheiro de volta a cada compra ou agendamento</p>
        </div>
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-colors"
        >
          <HelpCircle size={15} />
          <span>Como usar seu saldo?</span>
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
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => setIsHowItWorksOpen(true)}
              >
                Regras
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
        <h2 className="text-lg font-bold text-neutral-900 mb-4">Histórico de Movimentações</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-neutral-100 text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🪙
            </div>
            <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum cashback registrado ainda</h3>
            <p className="text-neutral-400 text-xs max-w-sm mx-auto">
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
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-400">
                        {new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {tx.code && (
                        <span className="text-[11px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                          {tx.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${isCredit ? 'text-green-600' : 'text-neutral-900'}`}>
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
        title="💡 Como usar seu cashback?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            O cashback do PetHub funciona de forma simples, transparente e sem pegadinhas. Veja o passo a passo:
          </p>

          <div className="space-y-3 pt-2">
            {[
              { step: '1', title: 'Escolha quanto deseja utilizar', desc: 'Clique em "Resgatar Saldo" e defina o valor desejado do seu saldo disponível.' },
              { step: '2', title: 'Confirme a utilização', desc: 'O sistema valida seu saldo e deduz o valor solicitado com segurança.' },
              { step: '3', title: 'Um código único será gerado', desc: 'Um código exclusivo de resgate (ex: CASH-7F2A-9B3E) será emitido instantaneamente.' },
              { step: '4', title: 'Apresente o código', desc: 'Informe o código ao estabelecimento parceiro no balcão ou durante o agendamento.' },
              { step: '5', title: 'Desconto aplicado', desc: 'O valor resgatado é descontado diretamente da sua conta conforme as regras da transação.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
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
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Código gerado com sucesso!</h3>
              <p className="text-xs text-neutral-500 mt-1">Apresente este código no estabelecimento para obter seu desconto.</p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between gap-3">
              <span className="text-lg font-mono font-extrabold text-orange-600 tracking-wider">
                {generatedCode}
              </span>
              <button
                onClick={() => handleCopy(generatedCode)}
                className="flex items-center gap-1 text-xs font-bold text-orange-700 hover:text-orange-900 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm"
              >
                <Copy size={13} />
                Copiar
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Este código é único, intransferível e fica registrado no seu histórico.
            </p>

            <Button fullWidth onClick={() => setIsRedeemOpen(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <p className="text-xs text-neutral-500">
              Saldo disponível: <strong className="text-neutral-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</strong>
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
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  R$ {val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRedeemAmount(balance.toFixed(2))}
                className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
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
