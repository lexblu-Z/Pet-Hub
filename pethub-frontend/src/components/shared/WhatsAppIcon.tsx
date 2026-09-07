import React from 'react';

export interface WhatsAppIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * WhatsApp Official Vector Icon
 * Rendered with 100% transparent background, crisp vector paths and official brand colors.
 * Replaces old symbols across all roles (Tutor, Profissional, Estabelecimento, Admin).
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  size = 'md',
  className = '',
}) => {
  let pixelSize = 20;
  if (size === 'xs') pixelSize = 13;
  else if (size === 'sm') pixelSize = 16;
  else if (size === 'md') pixelSize = 20;
  else if (size === 'lg') pixelSize = 26;
  else if (typeof size === 'number') pixelSize = size;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 inline-block align-middle ${className}`}
      aria-hidden="true"
    >
      {/* WhatsApp Speech Bubble */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 1.892.527 3.66 1.442 5.168L2.053 21.6a.6.6 0 00.747.747l4.432-1.389A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-1.042 5.6c-.22 0-.44.084-.607.251l-1.108 1.108a1.8 1.8 0 00-.472 1.637c.365 1.745 1.503 3.606 3.037 5.14 1.534 1.534 3.395 2.672 5.14 3.037.58.12 1.185-.05 1.637-.472l1.108-1.108a.858.858 0 000-1.214l-1.92-1.92a.858.858 0 00-1.214 0l-.634.634a.36.36 0 01-.418.067 7.74 7.74 0 01-2.472-1.636 7.74 7.74 0 01-1.636-2.472.36.36 0 01.067-.418l.634-.634a.858.858 0 000-1.214l-1.92-1.92a.853.853 0 00-.607-.252z"
        fill="#25D366"
      />
      {/* Handset Interior */}
      <path
        d="M10.958 7.6c-.22 0-.44.084-.607.251l-1.108 1.108a1.8 1.8 0 00-.472 1.637c.365 1.745 1.503 3.606 3.037 5.14 1.534 1.534 3.395 2.672 5.14 3.037.58.12 1.185-.05 1.637-.472l1.108-1.108a.858.858 0 000-1.214l-1.92-1.92a.858.858 0 00-1.214 0l-.634.634a.36.36 0 01-.418.067 7.74 7.74 0 01-2.472-1.636 7.74 7.74 0 01-1.636-2.472.36.36 0 01.067-.418l.634-.634a.858.858 0 000-1.214l-1.92-1.92a.853.853 0 00-.607-.252z"
        fill="white"
      />
    </svg>
  );
};

export default WhatsAppIcon;
