import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md border border-orange-500 hover:border-orange-600',
  secondary:
    'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm border border-neutral-900 dark:bg-[#282A2C] dark:hover:bg-[#313335] dark:border-[#313335] dark:text-[#E3E3E3]',
  outline:
    'border-2 border-orange-500 text-orange-600 hover:bg-orange-50 bg-transparent dark:hover:bg-orange-950/20 dark:text-orange-400',
  ghost:
    'bg-transparent hover:bg-neutral-100 text-neutral-700 border border-transparent dark:hover:bg-[#282A2C] dark:text-[#C4C7C5] dark:hover:text-[#E3E3E3]',
  danger:
    'bg-red-500 hover:bg-red-600 text-white shadow-sm border border-red-500',
  success:
    'bg-green-500 hover:bg-green-600 text-white shadow-sm border border-green-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rounded = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        whileHover={isDisabled ? undefined : { scale: 1.01 }}
        transition={{ duration: 0.15 }}
        className={[
          'inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          rounded ? 'rounded-full' : 'rounded-xl',
          fullWidth ? 'w-full' : '',
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={isDisabled}
        {...(props as any)}
      >
        {isLoading ? (
          <Loader2 className="animate-spin shrink-0" size={16} />
        ) : leftIcon ? (
          <span className="shrink-0 flex items-center">{leftIcon}</span>
        ) : null}
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
