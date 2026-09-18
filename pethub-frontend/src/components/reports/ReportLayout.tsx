import React from 'react';
import { Download, BarChart3, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export interface ReportTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface ReportLayoutProps {
  title: string;
  subtitle: string;
  badge: string;
  tabs: ReportTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onExportCsv?: () => void;
  isExportingCsv?: boolean;
  isExporting?: boolean;
  children: React.ReactNode;
}

export const ReportLayout: React.FC<ReportLayoutProps> = ({
  title,
  subtitle,
  badge,
  tabs,
  activeTab,
  onTabChange,
  onExportPdf,
  isExportingPdf = false,
  onExportCsv,
  isExportingCsv = false,
  isExporting = false,
  children,
}) => {
  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 sm:p-6 lg:p-8 dark:bg-neutral-950 transition-colors">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                <BarChart3 size={12} />
                {badge}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          </div>

          {/* Action Buttons: [ PDF ] Principal + [ CSV ] Secundário */}
          <div className="flex items-center gap-2.5">
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                disabled={isExportingPdf || isExporting}
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all duration-200 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                title="Exportar relatório em formato PDF profissional"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} className="transition-transform group-hover:-translate-y-0.5" />
                    <span>Exportar PDF</span>
                  </>
                )}
              </button>
            )}

            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                disabled={isExportingCsv || isExporting}
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1F20] px-3.5 sm:px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-[#C4C7C5] shadow-xs transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-[#282A2C] hover:text-neutral-900 dark:hover:text-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                title="Exportar dados brutos em formato CSV (Excel)"
              >
                {isExportingCsv ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-neutral-400" />
                    <span className="text-xs">Exportando...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={15} className="text-neutral-500 dark:text-neutral-400 transition-transform group-hover:-translate-y-0.5" />
                    <span>CSV</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-neutral-200/80 dark:border-neutral-800">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400 font-semibold'
                      : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content Area */}
        <main className="space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
