import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  bordered?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  hover = false,
  padding = 'md',
  className = '',
  children,
  onClick,
  selected = false,
  bordered = false,
}) => {
  const isClickable = !!onClick;

  const baseClasses = [
    'bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3] rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]',
    paddingClasses[padding],
    isClickable ? 'cursor-pointer' : '',
    hover
      ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.16)] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]'
      : '',
    selected
      ? 'ring-2 ring-orange-500 border-orange-500'
      : bordered
      ? 'border border-neutral-100 dark:border-[#313335]'
      : 'border border-transparent dark:border-[#282A2C]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isClickable) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileTap={{ scale: 0.99 }}
        whileHover={hover ? { y: -4 } : undefined}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
};

// Badge component
export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'brand'
  | 'outline'
  | 'dark';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5]',
  success: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-transparent dark:border-green-800/40',
  warning: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-transparent dark:border-amber-800/40',
  error: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-transparent dark:border-red-800/40',
  info: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-800/40',
  brand: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-transparent dark:border-orange-800/40',
  outline: 'border border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#C4C7C5] bg-transparent',
  dark: 'bg-neutral-900 dark:bg-[#282A2C] text-white border border-transparent dark:border-[#313335]',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  icon,
  className = '',
  dot = false,
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        badgeVariants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' ? 'bg-green-500' :
            variant === 'error' ? 'bg-red-500' :
            variant === 'warning' ? 'bg-amber-500' :
            variant === 'brand' ? 'bg-orange-500' : 'bg-neutral-400',
          ].join(' ')}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

// Avatar component
export interface AvatarProps {
  src?: string | null;
  fallbackSrc?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
  square?: boolean;
  role?: string;
  isEstablishment?: boolean;
  entityType?: 'establishment' | 'tutor' | 'professional' | 'admin' | 'user';
}

const avatarSizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const statusColors = {
  online: 'bg-green-400',
  offline: 'bg-neutral-300',
  busy: 'bg-amber-400',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-orange-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-purple-400',
    'bg-pink-400',
    'bg-teal-400',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

export const DEFAULT_AVATARS = [
  '/user.jpg',
  '/user2.jpg',
  '/user3.jpg',
  '/user4.jpg',
  '/user5.jpg',
  '/user6.jpg',
];

export function getStableAvatar(seed?: string | null): string {
  if (!seed) return DEFAULT_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  status,
  className = '',
  square = false,
  fallbackSrc,
  role,
  isEstablishment,
  entityType,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [fallbackFailed, setFallbackFailed] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
    setFallbackFailed(false);
  }, [src, fallbackSrc]);

  const isEstab = Boolean(
    isEstablishment ||
    entityType === 'establishment' ||
    role === 'ESTABLISHMENT' ||
    role === 'estabelecimento' ||
    fallbackSrc === '/user_estabelecimento.mp4' ||
    fallbackSrc?.includes('user_estabelecimento.mp4')
  );

  const resolvedSrc = getFullImageUrl(src);
  const hasRealPhoto = Boolean(resolvedSrc && !imgError);
  const resolvedFallback = fallbackSrc || getStableAvatar(name || 'user');

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={[
          avatarSizes[size],
          square ? 'rounded-xl' : 'rounded-full',
          'overflow-hidden flex items-center justify-center bg-neutral-100 dark:bg-[#282A2C] relative',
          (!hasRealPhoto && fallbackFailed) ? `${getColorFromName(name)} text-white font-semibold` : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hasRealPhoto ? (
          <img
            src={resolvedSrc}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : isEstab ? (
          <video
            src="/user_estabelecimento.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : !fallbackFailed ? (
          <img
            src={resolvedFallback}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setFallbackFailed(true)}
          />
        ) : (
          <span>{getInitials(name) || '?'}</span>
        )}
      </div>
      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
            statusColors[status],
          ].join(' ')}
        />
      )}
    </div>
  );
};
