import React from 'react';
import { FileText, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface FiscalNoticeCardProps {
  contextName: string;
}

export const FiscalNoticeCard: React.FC<FiscalNoticeCardProps> = ({ contextName }) => {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            Status Fiscal & Emissão (RF22)
            <span className="rounded-md bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/80 dark:text-amber-300">
              Informativo Operacional
            </span>
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/80">
            O PetHub gerencia e registra 100% dos comprovantes operacionais de vendas e atendimentos para o {contextName}.
            A emissão de <strong>NF-e / NFS-e oficial com validade jurídica</strong> requer credenciamento junto à SEFAZ ou prefeitura local com certificado digital (A1/A3), infraestrutura que ainda não se encontra ativada neste ambiente. Os relatórios acima refletem fielmente as transações reais registradas no banco de dados.
          </p>
        </div>
      </div>
    </div>
  );
};
