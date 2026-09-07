import React from 'react';
import { resolveServiceLogo } from '@/utils/serviceLogos';
import { Package } from 'lucide-react';

export interface ServiceLogoProps {
  category?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
  showBadge?: boolean;
}

export const ServiceLogo: React.FC<ServiceLogoProps> = ({
  category,
  name,
  size = 'md',
  className = '',
  showBadge = false,
}) => {
  const serviceDef = resolveServiceLogo(category, name);
  const IconComponent = serviceDef.icon;

  let pixelSize = 20;
  let badgePad = 'p-1.5 rounded-xl';

  if (size === 'xs') {
    pixelSize = 14;
    badgePad = 'p-1 rounded-lg';
  } else if (size === 'sm') {
    pixelSize = 18;
    badgePad = 'p-1.5 rounded-lg';
  } else if (size === 'md') {
    pixelSize = 22;
    badgePad = 'p-2 rounded-xl';
  } else if (size === 'lg') {
    pixelSize = 28;
    badgePad = 'p-2.5 rounded-2xl';
  } else if (typeof size === 'number') {
    pixelSize = size;
  }

  if (showBadge) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 border transition-transform ${badgePad} ${serviceDef.bgClass} ${serviceDef.colorClass} ${className}`}
        aria-hidden="true"
      >
        <IconComponent size={pixelSize} strokeWidth={2.2} className="shrink-0" />
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${serviceDef.colorClass} ${className}`}
      aria-hidden="true"
    >
      <IconComponent size={pixelSize} strokeWidth={2.2} className="shrink-0" />
    </span>
  );
};

export interface ItemLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export const ItemLogo: React.FC<ItemLogoProps> = ({
  size = 'sm',
  className = '',
}) => {
  let pixelSize = 16;
  if (size === 'xs') pixelSize = 13;
  if (size === 'sm') pixelSize = 16;
  if (size === 'md') pixelSize = 20;
  if (size === 'lg') pixelSize = 26;
  if (typeof size === 'number') pixelSize = size;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 text-orange-500 dark:text-orange-400 ${className}`}
      aria-hidden="true"
    >
      <Package size={pixelSize} strokeWidth={2.2} className="shrink-0" />
    </span>
  );
};

export default ServiceLogo;
