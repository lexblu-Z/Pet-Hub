import React from 'react';
import { resolvePaymentLogo } from '@/utils/serviceLogos';

export interface PaymentLogoProps {
  method?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
  useImgTag?: boolean;
}

/**
 * 100% Transparent Vector Logos for Payment Methods
 * Derived directly from the remastered assets in uploads/pgmntos/
 */

// 1. Pix Vector (Official complete 4-pointed curved diamond, 100% transparent)
export const PixVector: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'w-6 h-6' }) => (
  <svg
    viewBox="536 26 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${sizeClass} shrink-0`}
    aria-hidden="true"
  >
    <g fill="#32BCAD">
      <path d="m 553.82362,44.963326 c 3.08046,0 5.97782,1.19944 8.15622,3.37679 l 11.81982,11.82193 c 0.85125,0.85161 2.2412,0.85479 3.09457,-10e-4 l 11.77678,-11.77784 c 2.1784,-2.17735 5.07576,-3.37679 8.15622,-3.37679 h 1.41852 l -14.95778,-14.95813 c -4.65878,-4.658432 -12.2114,-4.658432 -16.86948,0 l -14.91509,14.91509 z" />
      <path d="m 610.61844,57.378776 -9.03922,-9.03922 c -0.19897,0.0797 -0.41452,0.12946 -0.64206,0.12946 h -4.10986 c -2.12478,0 -4.20476,0.86184 -5.70618,2.36432 l -11.77643,11.77678 c -1.10207,1.10208 -2.55022,1.65347 -3.99697,1.65347 -1.44815,0 -2.89524,-0.55139 -3.99697,-1.65241 l -11.82088,-11.82088 c -1.50142,-1.50283 -3.5814,-2.36431 -5.70618,-2.36431 h -5.05354 c -0.21555,0 -0.41698,-0.0508 -0.60713,-0.12242 l -9.07521,9.07521 c -4.65843,4.65843 -4.65843,12.2107 0,16.86913 l 9.07486,9.07485 c 0.1905,-0.0716 0.39193,-0.12241 0.60748,-0.12241 h 5.05354 c 2.12478,0 4.20476,-0.86148 5.70618,-2.36396 l 11.81982,-11.81982 c 2.13643,-2.13466 5.8607,-2.13537 7.995,0.001 l 11.77643,11.77573 c 1.50142,1.50248 3.5814,2.36431 5.70618,2.36431 h 4.10986 c 0.22754,0 0.44309,0.0497 0.64206,0.12947 l 9.03922,-9.03922 c 4.65808,-4.65843 4.65808,-12.2107 0,-16.86913" />
      <path d="m 596.82737,86.620206 c -3.08045,0 -5.97782,-1.19944 -8.15622,-3.37679 l -11.77678,-11.77713 c -0.82691,-0.82903 -2.26801,-0.82656 -3.09456,0 l -11.81982,11.82017 c -2.17841,2.17734 -5.07577,3.37679 -8.15623,3.37679 h -2.32092 l 14.9158,14.915444 c 4.65807,4.65808 12.21069,4.65808 16.86912,0 l 14.95813,-14.958484 z" />
    </g>
  </svg>
);

// 2. Cartão de Crédito Vector (Remastered from credito.png - pure card with EMV chip & stripes, transparent background)
export const CreditoVector: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'w-7 h-5' }) => (
  <svg
    viewBox="0 0 350 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${sizeClass} shrink-0`}
    aria-hidden="true"
  >
    <rect x="8" y="8" width="334" height="224" rx="20" fill="#18181B" stroke="#3F3F46" strokeWidth="3" />
    {/* EMV Chip */}
    <g transform="translate(38, 42)">
      <rect width="52" height="42" rx="7" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
      <line x1="18" y1="0" x2="18" y2="42" stroke="#B45309" strokeWidth="2" />
      <line x1="34" y1="0" x2="34" y2="42" stroke="#B45309" strokeWidth="2" />
      <line x1="0" y1="21" x2="52" y2="21" stroke="#B45309" strokeWidth="2" />
      <rect x="18" y="12" width="16" height="18" rx="2" fill="#FBBF24" />
    </g>
    {/* Card Details Stripes */}
    <rect x="38" y="132" width="260" height="13" rx="6.5" fill="#FFFFFF" fillOpacity="0.95" />
    <rect x="38" y="158" width="140" height="13" rx="6.5" fill="#FFFFFF" fillOpacity="0.95" />
    <rect x="38" y="184" width="140" height="13" rx="6.5" fill="#FFFFFF" fillOpacity="0.95" />
  </svg>
);

// 3. Cartão de Débito Vector (Remastered from debito.png - stacked cards with magnetic stripes & dual circles, transparent background)
export const DebitoVector: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'w-7 h-5' }) => (
  <svg
    viewBox="0 0 500 450"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${sizeClass} shrink-0`}
    aria-hidden="true"
  >
    {/* Card 1 (Back, rotated) */}
    <g transform="translate(130, 260) rotate(-42) translate(-150, -90)">
      <rect width="280" height="175" rx="16" fill="#3F3F46" stroke="#52525B" strokeWidth="3" />
      <rect x="0" y="32" width="280" height="38" fill="#FFFFFF" fillOpacity="0.95" />
    </g>
    {/* Card 2 (Middle, rotated) */}
    <g transform="translate(200, 275) rotate(-22) translate(-150, -90)">
      <rect width="290" height="180" rx="16" fill="#27272A" stroke="#3F3F46" strokeWidth="3" />
      <rect x="0" y="34" width="290" height="40" fill="#FFFFFF" fillOpacity="0.95" />
    </g>
    {/* Card 3 (Front, horizontal) */}
    <g transform="translate(180, 200)">
      <rect width="300" height="185" rx="16" fill="#18181B" stroke="#3F3F46" strokeWidth="3" />
      <rect x="0" y="35" width="300" height="40" fill="#FFFFFF" fillOpacity="0.95" />
      {/* Debit circles */}
      <circle cx="50" cy="135" r="22" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="78" cy="135" r="22" fill="#FFFFFF" fillOpacity="0.85" />
      {/* Details */}
      <rect x="155" y="130" width="34" height="10" rx="5" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="200" y="130" width="34" height="10" rx="5" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="245" y="130" width="34" height="10" rx="5" fill="#FFFFFF" fillOpacity="0.95" />
    </g>
  </svg>
);

// 4. Dinheiro Vector (Remastered from dinheiro.png - layered green banknotes with center dollar symbol, transparent background)
export const DinheiroVector: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'w-7 h-5' }) => (
  <svg
    viewBox="0 0 500 360"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${sizeClass} shrink-0`}
    aria-hidden="true"
  >
    {/* Note 1 (Back, rotated) */}
    <g transform="translate(240, 200) rotate(-22) translate(-175, -80)">
      <rect width="350" height="170" rx="8" fill="#1B5E52" />
      <rect x="8" y="8" width="334" height="154" rx="6" fill="none" stroke="#2D7A6D" strokeWidth="3" />
      <circle cx="20" cy="20" r="5" fill="#2D7A6D" />
      <circle cx="330" cy="20" r="5" fill="#2D7A6D" />
      <circle cx="20" cy="150" r="5" fill="#2D7A6D" />
      <circle cx="330" cy="150" r="5" fill="#2D7A6D" />
    </g>
    {/* Note 2 (Middle, rotated) */}
    <g transform="translate(245, 195) rotate(-11) translate(-175, -80)">
      <rect width="350" height="170" rx="8" fill="#2D7A6D" />
      <rect x="8" y="8" width="334" height="154" rx="6" fill="none" stroke="#3D9B8C" strokeWidth="3" />
      <circle cx="20" cy="20" r="5" fill="#3D9B8C" />
      <circle cx="330" cy="20" r="5" fill="#3D9B8C" />
      <circle cx="20" cy="150" r="5" fill="#3D9B8C" />
      <circle cx="330" cy="150" r="5" fill="#3D9B8C" />
    </g>
    {/* Note 3 (Front, horizontal) */}
    <g transform="translate(75, 105)">
      <rect width="350" height="170" rx="8" fill="#48A999" />
      <rect x="10" y="10" width="330" height="150" rx="6" fill="none" stroke="#328275" strokeWidth="3.5" />
      <rect x="16" y="16" width="318" height="138" rx="4" fill="none" stroke="#328275" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="6" fill="#328275" />
      <circle cx="324" cy="26" r="6" fill="#328275" />
      <circle cx="26" cy="144" r="6" fill="#328275" />
      <circle cx="324" cy="144" r="6" fill="#328275" />
      <ellipse cx="175" cy="85" rx="48" ry="60" fill="#328275" />
      <ellipse cx="175" cy="85" rx="42" ry="54" fill="#48A999" />
      <text x="175" y="104" fontFamily="Arial, Helvetica, sans-serif" fontSize="52" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        $
      </text>
      <line x1="38" y1="72" x2="105" y2="72" stroke="#6DC2B4" strokeWidth="7" strokeLinecap="round" />
      <line x1="38" y1="98" x2="105" y2="98" stroke="#6DC2B4" strokeWidth="7" strokeLinecap="round" />
      <line x1="245" y1="72" x2="312" y2="72" stroke="#6DC2B4" strokeWidth="7" strokeLinecap="round" />
      <line x1="245" y1="98" x2="312" y2="98" stroke="#6DC2B4" strokeWidth="7" strokeLinecap="round" />
    </g>
  </svg>
);

export const PaymentLogo: React.FC<PaymentLogoProps> = ({
  method,
  size = 'md',
  className = '',
  useImgTag = false,
}) => {
  const logoInfo = resolvePaymentLogo(method);

  // Standard size mapping
  let sizeClass = 'w-6 h-6';
  let cardSizeClass = 'w-7 h-5';

  if (size === 'xs') {
    sizeClass = 'w-4 h-4';
    cardSizeClass = 'w-5 h-3.5';
  } else if (size === 'sm') {
    sizeClass = 'w-5 h-5';
    cardSizeClass = 'w-6 h-4';
  } else if (size === 'md') {
    sizeClass = 'w-6 h-6';
    cardSizeClass = 'w-7 h-5';
  } else if (size === 'lg') {
    sizeClass = 'w-9 h-9';
    cardSizeClass = 'w-11 h-8';
  } else if (typeof size === 'number') {
    return (
      <img
        src={logoInfo.svgPath}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: 'auto' }}
        className={`object-contain shrink-0 ${className}`}
      />
    );
  }

  if (useImgTag) {
    return (
      <img
        src={logoInfo.svgPath}
        alt=""
        aria-hidden="true"
        className={`${logoInfo.type === 'pix' ? sizeClass : cardSizeClass} object-contain shrink-0 ${className}`}
      />
    );
  }

  // Inline Vector rendering with 100% transparent backgrounds
  switch (logoInfo.type) {
    case 'pix':
      return <PixVector sizeClass={`${sizeClass} ${className}`} />;
    case 'debito':
      return <DebitoVector sizeClass={`${cardSizeClass} ${className}`} />;
    case 'credito':
      return <CreditoVector sizeClass={`${cardSizeClass} ${className}`} />;
    case 'dinheiro':
      return <DinheiroVector sizeClass={`${cardSizeClass} ${className}`} />;
    default:
      return <CreditoVector sizeClass={`${cardSizeClass} ${className}`} />;
  }
};

export default PaymentLogo;
