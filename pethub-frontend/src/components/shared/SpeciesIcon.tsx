import React from 'react';

export interface SpeciesIconProps {
  speciesId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * Dedicated vector icons for distinct animal species in PetHub.
 * Strictly adheres to ZERO EMOJIS rule, rendering 100% transparent vector SVGs
 * with consistent stroke-width, rounded corners, and cohesive design system styling.
 */

// 1. Cachorro / Cão (Dog silhouette with floppy ears and snout)
export const DogVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M10 5.5C8 5.5 6.5 7 5 9.5c-1 1.6-1.5 3.5-.8 5.2.6 1.4 2 2.3 3.5 2.3h8.6c1.5 0 2.9-.9 3.5-2.3.7-1.7.2-3.6-.8-5.2-1.5-2.5-3-4-5-4-1 0-1.5.5-2 1-.5-.5-1-1-2-1z" />
    <path d="M4 10l-1.5 2c-.8 1.1-.3 2.6.9 3.1l1.6.7" />
    <path d="M20 10l1.5 2c.8 1.1.3 2.6-.9 3.1l-1.6.7" />
    <circle cx="9" cy="11.5" r="1" fill="currentColor" />
    <circle cx="15" cy="11.5" r="1" fill="currentColor" />
    <path d="M11 14.5c.6.4 1.4.4 2 0" />
    <path d="M12 13v1.5" />
  </svg>
);

// 2. Gato (Cat with pointy ears and whiskers)
export const CatVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M12 5c-3.8 0-7 2.8-7 6.5 0 2.2 1.1 4.1 2.8 5.3L7 20l4-1.2c.3.1.7.2 1 .2s.7-.1 1-.2L17 20l-.8-3.2c1.7-1.2 2.8-3.1 2.8-5.3C19 7.8 15.8 5 12 5z" />
    <path d="M5.5 8.5L4 3.5l4.5 2" />
    <path d="M18.5 8.5L20 3.5l-4.5 2" />
    <circle cx="9" cy="11" r="1" fill="currentColor" />
    <circle cx="15" cy="11" r="1" fill="currentColor" />
    <path d="M12 13.5l-1 1.2h2l-1-1.2z" fill="currentColor" />
    <path d="M4 13h3" />
    <path d="M4 15.5h3" />
    <path d="M17 13h3" />
    <path d="M17 15.5h3" />
  </svg>
);

// 3. Coelho (Rabbit with long upright ears)
export const RabbitVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Long Ears */}
    <path d="M8.5 2C7 2 6 4 6.5 7.5c.4 2.5 1.5 4 2.5 4.5" />
    <path d="M15.5 2c1.5 0 2.5 2 2 5.5-.4 2.5-1.5 4-2.5 4.5" />
    {/* Head */}
    <circle cx="12" cy="15" r="6" />
    <circle cx="9.5" cy="14" r="1" fill="currentColor" />
    <circle cx="14.5" cy="14" r="1" fill="currentColor" />
    <path d="M11 16.5c.6.3 1.4.3 2 0" />
    <path d="M12 15.5v1" />
  </svg>
);

// 4. Hamster (Round chubby cheeks, tiny round ears, whiskers)
export const HamsterVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="6.5" r="2.5" />
    <path d="M12 7.5c-4 0-7 2.2-7 5.5 0 2.8 2 4.5 4.5 5 1 .2 3.5.2 5 0 2.5-.5 4.5-2.2 4.5-5 0-3.3-3-5.5-7-5.5z" />
    <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="14.5" cy="11.5" r="1" fill="currentColor" />
    <path d="M11.5 13.5c.3.2.7.2 1 0" />
    <path d="M12 13v.8" />
    <path d="M4 13h2" />
    <path d="M4 14.5h2" />
    <path d="M18 13h2" />
    <path d="M18 14.5h2" />
  </svg>
);

// 5. Porquinho-da-índia / Cobaia / Guinea Pig (Blunt snout, droopy side ears)
export const GuineaPigVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M5 10c0-3.5 2.5-6 6-6s6 2.5 6 6c0 4-2.5 7-6 7s-6-3-6-7z" />
    <path d="M5 8.5C3.5 9 2.5 10.2 3 12c.4 1.3 1.5 1.5 2 1" />
    <path d="M17 8.5c1.5.5 2.5 1.7 2 3.5-.4 1.3-1.5 1.5-2 1" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" />
    <circle cx="13.5" cy="10" r="1" fill="currentColor" />
    <path d="M10 13c.6.4 1.4.4 2 0" />
    <path d="M11 12.2v.8" />
    <path d="M8 17v2" />
    <path d="M14 17v2" />
  </svg>
);

// 6. Furão / Ferret (Slender elongated weasel face, curved crest ears, mask marking)
export const FerretVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M7 6C5.5 5 4.5 6 5 7.5c.5 1.5 1.5 1.5 2 1" />
    <path d="M17 6c1.5-1 2.5 0 2 1.5-.5 1.5-1.5 1.5-2 1" />
    <path d="M12 5c-3.2 0-5.5 2.2-5.5 5.5 0 3.5 2.5 7.5 5.5 9.5 3-2 5.5-6 5.5-9.5 0-3.3-2.3-5.5-5.5-5.5z" />
    <path d="M7.5 10c1.2-.8 2.8-.8 4.5 0 1.7-.8 3.3-.8 4.5 0" />
    <circle cx="9.5" cy="10" r="1" fill="currentColor" />
    <circle cx="14.5" cy="10" r="1" fill="currentColor" />
    <path d="M11.5 14.5h1l-.5.8z" fill="currentColor" />
    <path d="M5.5 14h2.5" />
    <path d="M16 14h2.5" />
  </svg>
);

// General Rodent fallback
export const RodentVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="6" cy="7" r="2.5" />
    <circle cx="18" cy="7" r="2.5" />
    <path d="M12 8c-4.4 0-7.5 2.5-7.5 6.5 0 2.8 2 5 5 5.5.8.1 1.7.2 2.5.2s1.7-.1 2.5-.2c3-.5 5-2.7 5-5.5C19.5 10.5 16.4 8 12 8z" />
    <circle cx="9" cy="12.5" r="1" fill="currentColor" />
    <circle cx="15" cy="12.5" r="1" fill="currentColor" />
    <path d="M11.5 15c.3.2.7.2 1 0" />
    <path d="M12 14.2v.8" />
  </svg>
);

// 5. Ave / Pássaro / Calopsita / Papagaio (Bird with beak and crest)
export const BirdVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M16 7c0-2.8-2.2-5-5-5-1.5 0-2.8.6-3.8 1.7" />
    <path d="M11 2C7.7 2 5 4.7 5 8c0 2.2 1.2 4.1 3 5.1V20l3-2 3 2v-4.5c3.5-1.3 6-4.6 6-8.5 0-.7-.1-1.3-.2-2" />
    <path d="M19 8l3 2-3 2" />
    <circle cx="13" cy="7" r="1" fill="currentColor" />
    <path d="M5 8c2.5 1.5 5 1.5 7.5 0" />
  </svg>
);

// 6. Réptil / Tartaruga / Jabuti / Iguana (Reptile / Turtle carapace)
export const ReptileVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Shell */}
    <ellipse cx="12" cy="13" rx="6.5" ry="5.5" />
    {/* Head */}
    <path d="M12 7.5V4a1.5 1.5 0 013 0v3.5" />
    {/* Feet */}
    <path d="M7 9.5l-2.5-1.5" />
    <path d="M17 9.5l2.5-1.5" />
    <path d="M7 16.5l-2.5 1.5" />
    <path d="M17 16.5l2.5 1.5" />
    {/* Tail */}
    <path d="M12 18.5v2" />
    {/* Carapace pattern */}
    <path d="M12 9.5v7" />
    <path d="M8.5 13h7" />
  </svg>
);

// 7. Peixe ornamental (Fish with body, fins and tail)
export const FishVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M3 12c4-6 10-6 15 0-5 6-11 6-15 0z" />
    <path d="M17 12l5-4v8l-5-4z" />
    <circle cx="7" cy="11.5" r="1" fill="currentColor" />
    <path d="M11 9c1.5 1.8 1.5 4.2 0 6" />
    <path d="M12 6.5l-2-2.5" />
  </svg>
);

// 8. Outros animais de estimação (Diverse gentle companion icon)
export const OtherFaunaVector: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M12 3l1.9 4.3 4.6.5-3.5 3.1 1 4.6-4-2.3-4 2.3 1-4.6L5.5 7.8l4.6-.5L12 3z" />
    <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
  </svg>
);

export const SpeciesIcon: React.FC<SpeciesIconProps> = ({
  speciesId,
  size = 'md',
  className = '',
}) => {
  let pixelSize = 18;
  if (size === 'xs') pixelSize = 13;
  else if (size === 'sm') pixelSize = 15;
  else if (size === 'md') pixelSize = 18;
  else if (size === 'lg') pixelSize = 24;
  else if (typeof size === 'number') pixelSize = size;

  const normalized = (speciesId || '').toLowerCase().trim();

  // 1. Canino
  if (normalized.includes('dog') || normalized.includes('cao') || normalized.includes('cachorr')) {
    return <DogVector size={pixelSize} className={className} />;
  }

  // 2. Felino
  if (normalized.includes('cat') || normalized.includes('gato')) {
    return <CatVector size={pixelSize} className={className} />;
  }

  // 3. Coelho
  if (normalized.includes('rabbit') || normalized.includes('coelho')) {
    return <RabbitVector size={pixelSize} className={className} />;
  }

  // 4. Hamster
  if (normalized.includes('hamster')) {
    return <HamsterVector size={pixelSize} className={className} />;
  }

  // 5. Porquinho-da-índia / Cobaia / Guinea Pig
  if (normalized.includes('guinea_pig') || normalized.includes('porquinho') || normalized.includes('cobaia')) {
    return <GuineaPigVector size={pixelSize} className={className} />;
  }

  // 6. Furão / Ferret
  if (normalized.includes('ferret') || normalized.includes('furao')) {
    return <FerretVector size={pixelSize} className={className} />;
  }

  // 7. Outros Roedores (Rato, Chinchila, Ouriço, etc.)
  if (
    normalized.includes('rat') ||
    normalized.includes('chinchil') ||
    normalized.includes('hedgehog') ||
    normalized.includes('ourico') ||
    normalized.includes('rodent')
  ) {
    return <RodentVector size={pixelSize} className={className} />;
  }

  // 5. Aves
  if (
    normalized.includes('bird') ||
    normalized.includes('cockatiel') ||
    normalized.includes('calopsita') ||
    normalized.includes('parrot') ||
    normalized.includes('papagaio') ||
    normalized.includes('parakeet') ||
    normalized.includes('periquito') ||
    normalized.includes('canary') ||
    normalized.includes('canario') ||
    normalized.includes('lovebird') ||
    normalized.includes('agapornis') ||
    normalized.includes('ave') ||
    normalized.includes('passaro')
  ) {
    return <BirdVector size={pixelSize} className={className} />;
  }

  // 6. Répteis
  if (
    normalized.includes('turtle') ||
    normalized.includes('tartaruga') ||
    normalized.includes('jabuti') ||
    normalized.includes('iguana') ||
    normalized.includes('gecko') ||
    normalized.includes('snake') ||
    normalized.includes('serpente') ||
    normalized.includes('reptile')
  ) {
    return <ReptileVector size={pixelSize} className={className} />;
  }

  // 7. Peixes
  if (normalized.includes('fish') || normalized.includes('peixe')) {
    return <FishVector size={pixelSize} className={className} />;
  }

  // 8. Outro
  return <OtherFaunaVector size={pixelSize} className={className} />;
};

export default SpeciesIcon;
