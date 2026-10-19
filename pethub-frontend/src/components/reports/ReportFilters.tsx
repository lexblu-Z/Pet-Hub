import React from 'react';
import { Calendar, Filter, RotateCcw, AlertTriangle } from 'lucide-react';

export interface FilterPreset {
  label: string;
  getDates: () => { start: string; end: string };
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DATE_PRESETS: FilterPreset[] = [
  {
    label: 'Hoje',
    getDates: () => {
      const today = formatLocalYmd(new Date());
      return { start: today, end: today };
    },
  },
  {
    label: 'Últimos 7 dias',
    getDates: () => {
      const now = new Date();
      const end = formatLocalYmd(now);
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { start: formatLocalYmd(d), end };
    },
  },
  {
    label: 'Este Mês',
    getDates: () => {
      const now = new Date();
      const start = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { start, end };
    },
  },
  {
    label: 'Mês anterior',
    getDates: () => {
      const now = new Date();
      const start = formatLocalYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end };
    },
  },
  {
    label: 'Últimos 30 dias',
    getDates: () => {
      const now = new Date();
      const end = formatLocalYmd(now);
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { start: formatLocalYmd(d), end };
    },
  },
];

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;

  // Operation Type Filter (Todos, Serviços, Vendas)
  operationType?: string;
  onOperationTypeChange?: (op: string) => void;

  // Status Filter
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: Array<{ label: string; value: string }>;

  // Category Filter
  category?: string;
  onCategoryChange?: (category: string) => void;
  categories?: string[];

  // Professional Filter (establishment context)
  professionalId?: string;
  onProfessionalChange?: (id: string) => void;
  professionals?: Array<{ id: string; name: string }>;

  // Species Filter (customers & pets)
  species?: string;
  onSpeciesChange?: (species: string) => void;

  // Payment Method (financial)
  paymentMethod?: string;
  onPaymentMethodChange?: (method: string) => void;

  // Low stock (inventory)
  lowStockOnly?: boolean;
  onLowStockChange?: (val: boolean) => void;

  onReset?: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  startDate,
  endDate,
  onDateChange,
  operationType,
  onOperationTypeChange,
  status,
  onStatusChange,
  statusOptions,
  category,
  onCategoryChange,
  categories,
  professionalId,
  onProfessionalChange,
  professionals,
  species,
  onSpeciesChange,
  paymentMethod,
  onPaymentMethodChange,
  lowStockOnly,
  onLowStockChange,
  onReset,
}) => {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <span className="text-xs font-semibold uppercase text-neutral-400 dark:text-neutral-500 mr-1 flex items-center gap-1">
          <Calendar size={13} />
          Período:
        </span>
        {DATE_PRESETS.map((preset) => {
          const { start, end } = preset.getDates();
          const isActive = startDate === start && endDate === end;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onDateChange(start, end)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Detailed Filters Grid */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Operation Type Filter */}
        {onOperationTypeChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Tipo de Operação
            </label>
            <select
              value={operationType || 'ALL'}
              onChange={(e) => onOperationTypeChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="ALL">Todos os relatórios (Serviços e Vendas)</option>
              <option value="SERVICES">Apenas serviços</option>
              <option value="PRODUCTS">Apenas vendas de produtos</option>
            </select>
          </div>
        )}

        {/* Status Filter */}
        {statusOptions && onStatusChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={status || ''}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Filter */}
        {categories && onCategoryChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Categoria / Tipo
            </label>
            <select
              value={category || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Professional Filter (Establishment Context Only) */}
        {professionals && onProfessionalChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Profissional / Responsável
            </label>
            <select
              value={professionalId || ''}
              onChange={(e) => onProfessionalChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="">Todos os profissionais</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Species Filter */}
        {onSpeciesChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Espécie do Pet
            </label>
            <select
              value={species || ''}
              onChange={(e) => onSpeciesChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="">Todas as espécies</option>
              <option value="Cachorro">Cachorro / Cão</option>
              <option value="Gato">Gato / Felino</option>
              <option value="Pássaro">Pássaro / Ave</option>
              <option value="Outro">Outros</option>
            </select>
          </div>
        )}

        {/* Payment Method Filter */}
        {onPaymentMethodChange && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod || ''}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="">Todas as formas</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
              <option value="DEBIT_CARD">Cartão de Débito</option>
              <option value="CASH">Dinheiro</option>
            </select>
          </div>
        )}

        {/* Low Stock Checkbox (Inventory) */}
        {onLowStockChange && (
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="lowStockOnly"
              checked={lowStockOnly || false}
              onChange={(e) => onLowStockChange(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <label htmlFor="lowStockOnly" className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer">
              <AlertTriangle size={14} />
              Apenas estoque baixo (≤ 5) ou zerado
            </label>
          </div>
        )}
      </div>

      {onReset && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <RotateCcw size={12} />
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
};
