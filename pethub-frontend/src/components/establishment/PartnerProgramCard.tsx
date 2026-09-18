import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  ArrowRight, 
  FileText, 
  X, 
  AlertCircle, 
  TrendingUp,
  Receipt,
  LogOut
} from 'lucide-react';
import { api } from '@/services/api';
import { Button, Badge } from '@/components/ui';

interface ParticipationData {
  isEligible: boolean;
  id?: string;
  status: 'NOT_ENROLLED' | 'ACTIVE' | 'DECLINED' | 'SUSPENDED' | 'INELIGIBLE';
  termsVersion?: string;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  remunerationRate?: number;
  termsContent?: string;
  reason?: string;
}

interface PayoutItem {
  id: string;
  appointmentId: string;
  serviceName: string;
  servicePrice: number;
  remunerationRate: number;
  payoutAmount: number;
  status: string;
  periodMonth: string;
  createdAt: string;
  appointment?: {
    date: string;
    pet?: { name: string; species: string };
    tutor?: { name: string };
  };
}

export const PartnerProgramCard: React.FC = () => {
  const [participation, setParticipation] = useState<ParticipationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPayoutsModal, setShowPayoutsModal] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);

  // Payouts data
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payoutsSummary, setPayoutsSummary] = useState<any>(null);

  const fetchParticipation = async () => {
    try {
      const res = await api.get('/establishment/partner-program');
      setParticipation(res.data);
    } catch (err) {
      console.error('Erro ao buscar status do programa de parceiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/establishment/partner-program/payouts');
      setPayouts(res.data.payouts || []);
      setPayoutsSummary(res.data.summary || null);
    } catch (err) {
      console.error('Erro ao buscar repasses:', err);
    }
  };

  useEffect(() => {
    fetchParticipation();
  }, []);

  const handleOptIn = async () => {
    if (!termsAgreed) return;
    setActionLoading(true);
    try {
      await api.post('/establishment/partner-program/opt-in', {});
      await fetchParticipation();
      setShowTermsModal(false);
      setTermsAgreed(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao aderir ao programa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/establishment/partner-program/opt-out', {});
      await fetchParticipation();
      setShowOptOutModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao desativar participação.');
    } finally {
      setActionLoading(false);
    }
  };

  const openPayouts = () => {
    fetchPayouts();
    setShowPayoutsModal(true);
  };

  if (loading || !participation || !participation.isEligible) {
    return null;
  }

  const isActive = participation.status === 'ACTIVE';

  return (
    <>
      {/* Active Partner Banner */}
      {isActive ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:via-emerald-900/10 border border-emerald-500/20 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Parceiro Credenciado — Planos PetHub
                  </h3>
                  <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                    Ativo
                  </Badge>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Seu estabelecimento recebe agendamentos cobertos por planos com repasse de 70% e destaque prioritário nas buscas da plataforma.
                </p>
                {participation.acceptedAt && (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    Adesão confirmada em {new Date(participation.acceptedAt).toLocaleDateString('pt-BR')} (Termo v{participation.termsVersion || '1.0'})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openPayouts}
                className="text-xs font-semibold flex items-center gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Receipt size={14} />
                <span>Extrato de Repasses</span>
              </Button>
              <button
                onClick={() => setShowOptOutModal(true)}
                title="Desativar participação"
                className="text-xs text-neutral-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400 p-2 transition-colors rounded-xl"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Invitation Banner (NOT_ENROLLED or DECLINED) */
        <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-950/20 dark:via-[#1E1F20] border border-orange-500/20 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Programa de Credenciamento aos Planos PetHub
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    Adesão Opcional
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-3xl">
                  Aumente seu faturamento recebendo tutores assinantes dos planos PetHub. O credenciamento é voluntário, com repasse transparente de 70% sobre atendimentos concluídos e liquidados, além de prioridade de posicionamento nas buscas de serviços e catálogo.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> 70% de repasse líquido
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Prioridade de vitrine
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Sem taxas de adesão
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {participation.status !== 'DECLINED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOptOut}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                >
                  Agora não
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowTermsModal(true)}
                className="text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Ver Termos e Aderir</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Termos do Programa */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Termo de Adesão ao Programa de Parceiros
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    Versão 1.0 · PetHub Credenciamento e Fidelidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-[#131314] p-4 rounded-2xl border border-neutral-100 dark:border-[#313335]">
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                1. Natureza Voluntária
              </p>
              <p>
                A adesão ao Programa de Parceiros Credenciados PetHub é estritamente voluntária e não condiciona nem restringe a utilização dos demais recursos da plataforma pelo Estabelecimento.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                2. Atendimento aos Assinantes de Planos
              </p>
              <p>
                O estabelecimento parceiro compromete-se a acolher e prestar os serviços cobertos pelos planos contratados pelos tutores, observando os mesmos padrões de qualidade, agendamento e respeito aos animais.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                3. Critério e Taxa de Remuneração (70%)
              </p>
              <p>
                Para cada atendimento elegível executado, o PetHub repassará 70% (setenta por cento) do valor de tabela cadastrado para o respectivo serviço.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                4. Condição Financeira de Quitação
              </p>
              <p>
                O repasse financeiro é gerado unicamente após a conclusão presencial do atendimento com status REALIZADO (COMPLETED) e confirmação formal de liquidação do pagamento. Atendimentos cancelados ou não liquidados não geram repasse.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                5. Calendário e Extrato de Pagamento
              </p>
              <p>
                Os repasses são consolidados mensalmente por período contábil e liquidados conforme o cronograma financeiro da plataforma, com histórico detalhado e rastreável pelo painel do estabelecimento.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                6. Destaque e Posicionamento de Busca
              </p>
              <p>
                Os estabelecimentos participantes recebem indicador visual discreto de Parceiro do Programa e prioridade equilibrada nos resultados de busca de serviços e vitrine de produtos.
              </p>

              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                7. Desligamento do Programa
              </p>
              <p>
                O estabelecimento participante pode requerer seu desligamento do programa a qualquer momento através deste painel, sem cobrança de multas ou penalidades, preservando repasses já apurados de serviços prestados.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#1E1F20] cursor-pointer hover:border-orange-500/50 transition-colors">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 rounded text-orange-500 focus:ring-orange-500 h-4 w-4"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300 select-none leading-relaxed">
                Declaro que li e concordo integralmente com os termos e regras de prestação de serviços do Programa de Parceiros PetHub com repasse de 70%.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTermsModal(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOptIn}
                disabled={!termsAgreed || actionLoading}
                className="font-semibold"
              >
                {actionLoading ? 'Processando...' : 'Aceitar e Confirmar Adesão'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Extrato de Repasses */}
      {showPayoutsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Extrato de Repasses de Parceiro
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    Histórico de atendimentos elegíveis e repasses calculados (70%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayoutsModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary cards */}
            {payoutsSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#131314] border border-neutral-100 dark:border-[#313335]">
                  <p className="text-[11px] text-neutral-400">Calculado</p>
                  <p className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payoutsSummary.totalCalculated || 0)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">Aprovado</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payoutsSummary.totalApproved || 0)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Pago</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payoutsSummary.totalPaid || 0)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#131314] border border-neutral-100 dark:border-[#313335]">
                  <p className="text-[11px] text-neutral-400">Total Itens</p>
                  <p className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                    {payoutsSummary.totalCount || 0}
                  </p>
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-72 overflow-y-auto space-y-2">
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                  Nenhum repasse registrado até o momento. Conforme os atendimentos de clientes do plano forem concluídos e liquidados, os repasses de 70% aparecerão automaticamente aqui.
                </div>
              ) : (
                payouts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#131314] border border-neutral-100 dark:border-[#313335] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{p.serviceName}</p>
                      <p className="text-neutral-400 text-[11px] mt-0.5">
                        {p.appointment?.tutor?.name || 'Cliente do Plano'} {p.appointment?.pet?.name ? `(${p.appointment.pet.name})` : ''} · Período {p.periodMonth}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.payoutAmount)}
                      </p>
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowPayoutsModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Opt-out */}
      {showOptOutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Desativar Participação no Programa?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Ao desativar sua participação, seu estabelecimento deixará de receber agendamentos vinculados a planos de fidelidade e o destaque prioritário nas buscas será desativado. Todos os repasses já acumulados permanecem preservados.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptOutModal(false)}
                disabled={actionLoading}
              >
                Manter Ativo
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleOptOut}
                disabled={actionLoading}
                className="font-semibold"
              >
                {actionLoading ? 'Desativando...' : 'Confirmar Saída'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
