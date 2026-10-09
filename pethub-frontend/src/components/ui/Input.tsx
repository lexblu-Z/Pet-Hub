import React from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      success,
      leftIcon,
      rightIcon,
      onRightIconClick,
      className = '',
      id,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || Math.random().toString(36).slice(2);
    const isPassword = type === 'password';
    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-[#E3E3E3] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-[#8E918F] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={[
              'w-full rounded-xl border px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F]',
              'transition-all duration-200 outline-none',
              'bg-white dark:bg-[#1E1F20]',
              leftIcon ? 'pl-10' : '',
              rightIcon || isPassword ? 'pr-10' : '',
              error
                ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40 focus:border-red-500'
                : success
                ? 'border-green-400 dark:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/40 focus:border-green-500'
                : 'border-neutral-200 dark:border-[#313335] focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950/40 focus:border-orange-400 dark:focus:border-orange-500',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
            onWheel={(e) => {
              if (actualType === 'number') {
                (e.target as HTMLElement).blur();
              }
              props.onWheel?.(e);
            }}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPassword && rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              tabIndex={-1}
            >
              {rightIcon}
            </button>
          )}
          {error && !rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
              <AlertCircle size={16} />
            </div>
          )}
          {success && !error && !rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
              <CheckCircle size={16} />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ---- Select ----
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || Math.random().toString(36).slice(2);
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-neutral-700 dark:text-[#E3E3E3] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'w-full rounded-xl border px-4 py-2.5 text-sm text-neutral-900 dark:text-[#E3E3E3] bg-white dark:bg-[#1E1F20]',
            'transition-all duration-200 outline-none appearance-none',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40'
              : 'border-neutral-200 dark:border-[#313335] focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950/40 focus:border-orange-400 dark:focus:border-orange-500',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-neutral-400 dark:text-[#8E918F]">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ---- Textarea ----
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCharCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCharCount, className = '', id, maxLength, value, ...props }, ref) => {
    const textareaId = id || Math.random().toString(36).slice(2);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-700 dark:text-[#E3E3E3] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          value={value}
          className={[
            'w-full rounded-xl border px-4 py-3 text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F]',
            'transition-all duration-200 outline-none resize-none',
            'bg-white dark:bg-[#1E1F20]',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40'
              : 'border-neutral-200 dark:border-[#313335] focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950/40 focus:border-orange-400 dark:focus:border-orange-500',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        <div className="flex justify-between mt-1">
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : hint ? (
            <p className="text-xs text-neutral-400">{hint}</p>
          ) : (
            <span />
          )}
          {showCharCount && maxLength && (
            <p className="text-xs text-neutral-400">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
