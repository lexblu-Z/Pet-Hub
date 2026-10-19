import React, { useState } from 'react';
import { Building2, Stethoscope } from 'lucide-react';
import { getFullImageUrl } from '@/utils/image';

interface EstablishmentImageProps {
  src?: string | null;
  alt: string;
  role?: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export const EstablishmentImage: React.FC<EstablishmentImageProps> = ({
  src,
  alt,
  role,
  className = 'w-14 h-14 rounded-xl object-cover shrink-0',
  fallbackClassName,
  iconSize,
  showLabel = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = getFullImageUrl(src);

  const isProf = role === 'PROFESSIONAL' || role?.toLowerCase().includes('prof');

  if (!resolvedUrl || hasError) {
    const computedIconSize = iconSize || (className.includes('w-10') ? 18 : className.includes('h-48') ? 36 : 22);

    return (
      <div
        className={
          fallbackClassName ||
          `${className.replace(/object-\w+/g, '')} flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100/70 dark:from-[#282A2C] dark:to-[#1E1F20] border border-orange-200/60 dark:border-orange-500/20 text-orange-500 dark:text-orange-400 select-none shadow-xs`
        }
        aria-label={alt}
      >
        {isProf ? (
          <Stethoscope size={computedIconSize} className="text-orange-500 dark:text-orange-400 shrink-0" />
        ) : (
          <Building2 size={computedIconSize} className="text-orange-500 dark:text-orange-400 shrink-0" />
        )}
        {showLabel && !className.includes('w-10') && !className.includes('w-8') && !className.includes('h-48') && (
          <span className="text-[9px] font-semibold text-neutral-500 dark:text-[#8E918F] mt-0.5 max-w-[80%] truncate leading-tight text-center">
            {isProf ? 'Profissional' : 'Pet Shop'}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
