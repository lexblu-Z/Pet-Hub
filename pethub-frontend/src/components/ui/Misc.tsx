import React from 'react';
import { Star } from 'lucide-react';

// ---- Rating ----
export interface RatingProps {
  value: number;
  max?: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const starSizes = { sm: 14, md: 18, lg: 24 };

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  readonly = true,
  onChange,
  size = 'md',
  showValue = false,
  className = '',
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const starSize = starSizes[size];
  const displayValue = hovered ?? value;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className={[
            'transition-transform duration-100',
            !readonly ? 'cursor-pointer hover:scale-110' : 'cursor-default',
          ].join(' ')}
        >
          <Star
            size={starSize}
            className={
              star <= displayValue
                ? 'fill-amber-400 text-amber-400'
                : 'fill-neutral-200 text-neutral-200'
            }
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-neutral-600">{value.toFixed(1)}</span>
      )}
    </div>
  );
};

// ---- Progress Bar ----
export interface ProgressProps {
  value: number;
  label?: string;
  showValue?: boolean;
  color?: 'orange' | 'green' | 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const progressColors = {
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
};

const progressSizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  showValue = false,
  color = 'orange',
  size = 'md',
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-neutral-600">{label}</span>}
          {showValue && <span className="text-sm font-medium text-neutral-700">{Math.round(value)}%</span>}
        </div>
      )}
      <div className={`w-full bg-neutral-100 rounded-full ${progressSizes[size]}`}>
        <div
          className={`${progressColors[color]} ${progressSizes[size]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

// ---- Skeleton ----
export interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height,
  width,
  rounded = 'rounded-lg',
}) => (
  <div
    className={`skeleton ${rounded} ${className}`}
    style={{
      height: typeof height === 'number' ? `${height}px` : height,
      width: typeof width === 'number' ? `${width}px` : width,
    }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
    <Skeleton height={180} rounded="rounded-xl" className="mb-4 w-full" />
    <Skeleton height={20} width="60%" className="mb-2" />
    <Skeleton height={16} width="40%" className="mb-4" />
    <div className="flex gap-2">
      <Skeleton height={32} width="50%" />
      <Skeleton height={32} width="50%" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
        <Skeleton height={48} width={48} rounded="rounded-full" />
        <div className="flex-1">
          <Skeleton height={16} width="60%" className="mb-2" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
    ))}
  </div>
);

// ---- Empty State ----
export interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  imageUrl?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji,
  icon,
  imageUrl,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
    {imageUrl && (
      <img src={imageUrl} alt={title} className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white mb-6" />
    )}
    {!imageUrl && emoji && <div className="text-6xl mb-4">{emoji}</div>}
    {!imageUrl && !emoji && icon && <div className="mb-4 text-neutral-300">{icon}</div>}
    <h3 className="text-lg font-semibold text-neutral-700 mb-2">{title}</h3>
    {description && <p className="text-sm text-neutral-400 max-w-xs mb-6">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ---- Stepper ----
export interface StepperProps {
  steps: Array<{ id: number; label: string; description?: string }>;
  currentStep: number;
  variant?: 'horizontal' | 'compact';
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  variant = 'horizontal',
}) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="text-xs text-neutral-500">
          Etapa {currentStep} de {steps.length}
        </span>
        <div className="flex gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={[
                'h-1.5 rounded-full transition-all duration-300',
                step.id === currentStep
                  ? 'w-6 bg-orange-500'
                  : step.id < currentStep
                  ? 'w-3 bg-orange-300'
                  : 'w-3 bg-neutral-200',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                step.id < currentStep
                  ? 'bg-orange-500 text-white'
                  : step.id === currentStep
                  ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                  : 'bg-neutral-100 text-neutral-400',
              ].join(' ')}
            >
              {step.id < currentStep ? '✓' : step.id}
            </div>
            <span
              className={[
                'text-xs mt-1 font-medium hidden sm:block text-center',
                step.id <= currentStep ? 'text-neutral-700' : 'text-neutral-400',
              ].join(' ')}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                'flex-1 h-0.5 mx-2 transition-all duration-300',
                step.id < currentStep ? 'bg-orange-500' : 'bg-neutral-200',
              ].join(' ')}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ---- Search Bar ----
export interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Pesquisar...',
  value,
  onChange,
  onClear,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ---- Stat Card ----
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'orange' | 'green' | 'blue' | 'purple' | 'red';
  trend?: 'up' | 'down';
  className?: string;
}

const statColors = {
  orange: { iconBg: 'bg-orange-100', icon: 'text-orange-500' },
  green: { iconBg: 'bg-green-100', icon: 'text-green-500' },
  blue: { iconBg: 'bg-blue-100', icon: 'text-blue-500' },
  purple: { iconBg: 'bg-purple-100', icon: 'text-purple-500' },
  red: { iconBg: 'bg-red-100', icon: 'text-red-500' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'orange',
  trend,
  className = '',
}) => {
  const colors = statColors[color];

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
          <div className={colors.icon}>{icon}</div>
        </div>
        {change !== undefined && (
          <span
            className={[
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend === 'up' || change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
      <p className="text-sm text-neutral-500">{title}</p>
      {changeLabel && <p className="text-xs text-neutral-400 mt-1">{changeLabel}</p>}
    </div>
  );
};

// ---- Tabs ----
export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  if (variant === 'pills') {
    return (
      <div className={`flex gap-2 flex-wrap ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`border-b border-neutral-200 ${className}`}>
      <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2',
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
