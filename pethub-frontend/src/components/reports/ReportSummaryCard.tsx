import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';

interface ReportSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  notice?: string;
  trend?: {
    label: string;
    positive?: boolean;
  };
}

export const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-orange-600 dark:text-orange-400',
  iconBg = 'bg-orange-100 dark:bg-orange-950/40',
  notice,
  trend,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            <span>{title}</span>
            {notice && (
              <span title={notice} className="cursor-help text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <Info size={13} />
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
            {value}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {subtitle}
            </div>
          )}
          {trend && (
            <div className={`mt-2 inline-flex items-center text-xs font-medium ${trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
              {trend.label}
            </div>
          )}
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};
