import React from 'react';
import { normalizeSpecies } from '@/utils/species';

export interface SpeciesVectorProps {
  size?: number;
  className?: string;
}

export interface SpeciesIconProps {
  speciesId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * Dedicated vector icons for distinct animal species in PetHub.
 * Strictly adheres to ZERO EMOJIS rule, rendering 100% transparent vector SVGs
 * with consistent stroke-width, rounded corners, and cohesive design system styling.
 *
 * Each species has an EXCLUSIVE, recognizable vector design.
 */

// 1. Cachorro / Cão (Dog with friendly snout and floppy ears)
export const DogVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    <path d="M12 13.2v1.3" />
  </svg>
);

// 2. Gato (Cat with pointed upright ears, whiskers and cat eyes)
export const CatVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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

// 3. Coelho (Rabbit with tall upright ears and twitch nose)
export const RabbitVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Tall upright ears */}
    <path d="M8.5 2.5C7 2.5 6 4.5 6.5 8c.3 2 1.5 3.5 2.5 4" />
    <path d="M15.5 2.5c1.5 0 2.5 2 2 5.5-.3 2-1.5 3.5-2.5 4" />
    {/* Head */}
    <circle cx="12" cy="15.5" r="5.5" />
    <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
    <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
    <path d="M11 17c.6.3 1.4.3 2 0" />
    <path d="M12 16.2v.8" />
    <path d="M5.5 15.5h2" />
    <path d="M16.5 15.5h2" />
  </svg>
);

// 4. Hamster (Chubby puffed cheeks, small top ears, round snout)
export const HamsterVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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

// 5. Porquinho-da-índia / Cobaia (Robust profile, blunt snout, drooping petal ears, no tail)
export const GuineaPigVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Robust body profile without tail */}
    <path d="M3 13.5c0-4 3-7.5 8-7.5 4.5 0 8 2.5 9.5 6 .5 1.5.5 3.5-.5 5-1.5 2-4 2.5-6.5 2.5H7c-2.5 0-4-2-4-6z" />
    {/* Drooping side ear */}
    <path d="M14 6c1.5-1 3.5-.5 3.5 1.5 0 1.5-1 2.5-2.5 2.5" />
    {/* Eye */}
    <circle cx="17" cy="11" r="1" fill="currentColor" />
    {/* Blunt nose & whiskers */}
    <circle cx="20" cy="13" r="0.6" fill="currentColor" />
    <path d="M18.5 14.5c.5.5 1.5.5 2 0" />
    {/* Stubby paws */}
    <path d="M7 19.5v2" />
    <path d="M14.5 19.5v2" />
  </svg>
);

// 6. Furão / Ferret (Slender arched mustelid body, bandit eye mask, curious snout)
export const FerretVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Long arched back */}
    <path d="M4 17.5c.5-4.5 3.5-9.5 9-9.5 3 0 5.5 1.5 6.5 3.5" />
    {/* Head & snout */}
    <path d="M19 11.5c1.2-.5 2.5-.2 2.8 1 .5 1.3 0 2.5-1.3 3.2L17 17" />
    {/* Rounded ear */}
    <path d="M17.5 9.5c0-1.2.8-2 1.8-1.5s1 1.5.5 2.5" />
    {/* Eye inside mask */}
    <circle cx="19" cy="12.5" r="0.8" fill="currentColor" />
    <path d="M17 12c1.5-.5 3 .5 4 0" />
    {/* Body belly & legs */}
    <path d="M17 17l-1 4.5" />
    <path d="M8 17l-.8 4.5" />
    {/* Long curved weasel tail */}
    <path d="M4 17.5c-1.5 1-1.8 3-.5 4.5 1.3 1.5 3 .5 3.5-1" />
  </svg>
);

// 7. Rato doméstico / Twister (Conical pointed snout, large rounded ears, whiskers, long curved tail)
export const RatVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Large round ears */}
    <circle cx="12.5" cy="6" r="3" />
    <path d="M8.5 7.5C7.5 6.5 6 7 5.5 8.5c-.5 1.5.5 3 2 3" />
    {/* Rat body with pointed snout */}
    <path d="M7.5 11.5C5.5 13 3.5 14 2 14.5c2 1.2 4.5 1.5 6.5 1.2 2.5 1.8 5.5 2.3 8.5.8 2-1 2.5-3 1.5-5-.8-1.8-2.5-3-4.5-3" />
    {/* Eye & pointed nose */}
    <circle cx="4.5" cy="13.5" r="0.8" fill="currentColor" />
    <path d="M2 13l2 .8" />
    <path d="M2 16l2-.8" />
    {/* Long curving rat tail */}
    <path d="M18.5 16.5c1.8 1.5 3.5 2 4 .5.5-2-1.5-4-1.5-6" />
    <path d="M8.5 17.5v2" />
    <path d="M14.5 17.5v2" />
  </svg>
);

// 8. Calopsita (Prominent feathered crest/topete plume, orange cheek patch, curved small beak)
export const CockatielVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Distinctive tall feathered crest (topete plume) */}
    <path d="M10 9C9 6 10 2 13 2c-1.5 2.5-.5 5 0 7" />
    <path d="M11 6c1-2 2.5-3.5 4-4-1 2 0 4 0 5" />
    {/* Head & body */}
    <path d="M8 11.5c0-2.5 1.8-4.5 4-4.5 2.2 0 4 1.8 4 4 0 1.5-.6 3-1.5 4L15 22l-4-3-2 3v-7c-.6-.7-1-1.6-1-2.5z" />
    {/* Small hooked beak */}
    <path d="M16 11l3 1.5-3 1.5" />
    {/* Eye */}
    <circle cx="12.5" cy="10.5" r="1" fill="currentColor" />
    {/* Characteristic round cheek patch (bochecha laranja) */}
    <circle cx="13" cy="13.5" r="1.5" />
  </svg>
);

// 9. Papagaio (Robust hooked downward-curving beak, round eye with orbital patch ring)
export const ParrotVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Robust rounded parrot head & sturdy neck */}
    <path d="M6 19v-4c0-4.5 3-8 7.5-8 3 0 5.5 1.5 6.5 4" />
    {/* Large hooked downward beak */}
    <path d="M18.5 9.5c1.5.5 3.5 2 3.5 4.5 0 2-1.5 3.5-3 4-1 .3-1.5-.5-1.5-1.5v-7z" fill="currentColor" fillOpacity="0.1" />
    <path d="M17.5 15c1-.5 2-1.5 2-2.5" />
    {/* Eye with orbital patch */}
    <circle cx="13" cy="10.5" r="1" fill="currentColor" />
    <circle cx="13" cy="10.5" r="2.2" strokeDasharray="1.5 1.5" />
    {/* Body & wing */}
    <path d="M6 15c1.5 2.5 4 4 7 4" />
    <path d="M6 19l2 3h4l-1-3" />
  </svg>
);

// 10. Periquito (Small sleek parakeet body, distinct cere above beak, long tail feathers)
export const ParakeetVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Sleek parakeet head & body */}
    <path d="M8 12c0-3 2-5 5-5s5 2 5 5c0 2-1 4-2.5 5.5L16 22l-3-2-2 2v-6.5c-1.8-.8-3-2.5-3-4z" />
    {/* Cere (cera) & small beak */}
    <path d="M17.5 11.5l2.5 1-2.5 1.5" />
    <ellipse cx="16" cy="11" rx="1" ry="0.6" fill="currentColor" />
    {/* Eye */}
    <circle cx="13" cy="10.5" r="1" fill="currentColor" />
    {/* Cheek spot */}
    <circle cx="13.5" cy="13" r="0.8" />
    {/* Long slender tail feathers */}
    <path d="M13.5 17.5L15 22" />
  </svg>
);

// 11. Canário (Delicate songbird profile, sharp fine singing beak, perched posture)
export const CanaryVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Songbird head & puffed chest */}
    <path d="M5 16c.5-3 2.5-6 6.5-7 2.5 0 4.5 1 5.5 2.5" />
    {/* Fine sharp singing beak */}
    <path d="M17 11.5l4-1.5-4 2.5" />
    {/* Eye */}
    <circle cx="14" cy="10" r="1" fill="currentColor" />
    {/* Perched body, wing and tail */}
    <path d="M5 16c2 2.5 5 3 8 2l6 4-2-6c.5-.7.8-1.5.8-2.5" />
    <path d="M9 14c2 0 4 1 5 3" />
    {/* Perch bar */}
    <path d="M4 21h8" strokeWidth="1.5" />
  </svg>
);

// 12. Agapornis / Lovebird (Stocky compact body, large round head, white eye ring, short tail)
export const LovebirdVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Compact stocky body & rounded head */}
    <path d="M7 14c0-3.5 2.5-6.5 6-6.5 3 0 5 2 5.5 4.5" />
    {/* Prominent curved lovebird beak */}
    <path d="M18.5 12c1.2.3 2.5 1.5 2.5 3 0 1.2-.8 2-2 2h-1v-5z" fill="currentColor" fillOpacity="0.1" />
    {/* Distinctive eye-ring around eye */}
    <circle cx="13" cy="11.5" r="2.2" />
    <circle cx="13" cy="11.5" r="1" fill="currentColor" />
    {/* Short blunt tail & plump breast */}
    <path d="M7 14c0 3 2 5 5 5h3l2 3v-4.5c.7-.6 1.2-1.5 1.5-2.5" />
    <path d="M9 15c1 1.5 2.5 2.5 4.5 2.5" />
  </svg>
);

// 13. Tartaruga / Jabuti (Domed patterned carapace, outstretched head, stubby elephantine legs)
export const TurtleVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Domed shell / carapace */}
    <path d="M5 14c0-4 3.1-7 7-7s7 3 7 7c0 .5-.1 1-.3 1.5H5.3c-.2-.5-.3-1-.3-1.5z" />
    {/* Scute markings on shell */}
    <path d="M9 14c0-2.2 1.3-4 3-4s3 1.8 3 4" />
    <path d="M12 7v3" />
    <path d="M7 11.5l2 2.5" />
    <path d="M17 11.5l-2 2.5" />
    {/* Outstretched head with eye */}
    <path d="M19 13.5c1.5 0 3-1 3-2.5s-1.2-2.5-2.5-2.5c-.8 0-1.5.4-2 1" />
    <circle cx="20.5" cy="10" r="0.6" fill="currentColor" />
    {/* Stubby clawed feet */}
    <path d="M6 15.5l-2 2c-.3.3-.3.8 0 1.1.3.3.8.3 1.1 0l1.4-1.4" />
    <path d="M17 15.5l1.5 1.5c.3.3.8.3 1.1 0 .3-.3.3-.8 0-1.1L18 14.5" />
    {/* Bottom plastron */}
    <path d="M4 15.5h15" />
    {/* Little tail */}
    <path d="M4.5 14.5L2 14" />
  </svg>
);

// 14. Iguana (Prominent spiny dorsal crest, subtympanic cheek plate, throat dewlap/barbela)
export const IguanaVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Spiny dorsal crest along the back */}
    <path d="M5 6l1.5 2M8 4.5l1.5 2.5M11 4l1 3M14 4.5l.5 2.5M17 6l-.5 2" />
    {/* Head, snout and long lizard body */}
    <path d="M4 14c0-4 3-6.5 8-6.5 3.5 0 6 1 8.5 3.5 1 1 1.5 2.5 1.5 4 0 1.5-1 2.5-2.5 2.5H16l-3 2.5" />
    {/* Subtympanic round cheek plate */}
    <circle cx="17.5" cy="13.5" r="1.5" />
    {/* Eye */}
    <circle cx="18" cy="10.5" r="1" fill="currentColor" />
    {/* Throat dewlap (barbela) */}
    <path d="M14 15c-1 3-3.5 4.5-5 4.5-.8 0-1.2-.5-1-1.2.3-1 1-2.3 2-3.3" />
    {/* Foreleg */}
    <path d="M8 14.5L5 19l2 1" />
  </svg>
);

// 15. Gecko (Sinuous gecko body, big round lidless eyes, wide toe discs / lamellae)
export const GeckoVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Central gecko spine & head */}
    <path d="M12 4c-1.5 0-2.5 1.2-2.5 2.5 0 1.5 1 2.5 2.5 3.5 1.5-1 2.5-2 2.5-3.5C14.5 5.2 13.5 4 12 4z" />
    {/* Big round gecko eyes */}
    <circle cx="10" cy="5.5" r="1" fill="currentColor" />
    <circle cx="14" cy="5.5" r="1" fill="currentColor" />
    {/* Sinuous body down to tail */}
    <path d="M12 10c-1 2-1 5 0 7s2 3 1.5 4.5c-.3.8-1.5 1-2 .5" />
    {/* Front limbs with suction toe-discs (lamellae) */}
    <path d="M9.5 9L5 8" />
    <circle cx="4" cy="7" r="1" fill="currentColor" />
    <circle cx="3.5" cy="9" r="1" fill="currentColor" />
    <path d="M14.5 9L19 8" />
    <circle cx="20" cy="7" r="1" fill="currentColor" />
    <circle cx="20.5" cy="9" r="1" fill="currentColor" />
    {/* Hind limbs with suction toe-discs */}
    <path d="M10.5 16L6 17" />
    <circle cx="5" cy="16" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18.5" r="1" fill="currentColor" />
    <path d="M13.5 16L18 17" />
    <circle cx="19" cy="16" r="1" fill="currentColor" />
    <circle cx="19.5" cy="18.5" r="1" fill="currentColor" />
  </svg>
);

// 16. Serpente de estimação (Sinuous undulating S-curved coiled body, forked tongue)
export const SnakeVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Sleek head */}
    <path d="M15 6c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5c0 1-1 2-2.5 2H15z" />
    <circle cx="17.5" cy="5.5" r="0.8" fill="currentColor" />
    {/* Forked tongue */}
    <path d="M20 6h2m0 0l1.5-1m-1.5 1l1.5 1" strokeWidth="1.5" />
    {/* Sinuous S-shaped coiled snake body */}
    <path d="M15 7.5c-3 0-5 1.5-5 3.5s2 3 5 3.5 5 1.5 5 3.5-2 3.5-5.5 3.5c-4 0-6.5-2-7.5-4.5" />
    {/* Tail loop */}
    <path d="M7 16.5C5 16 3 14 3 11.5s2-4 5-4" strokeDasharray="3 2" />
  </svg>
);

// 17. Peixe ornamental (Streamlined body, flowing dorsal and rippling tail fins)
export const FishVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Streamlined body */}
    <path d="M3 12c3.5-4.5 9-5.5 13-1 2 .5 3.5 1.5 4.5 2.5-1 1-2.5 2-4.5 2.5-4 4.5-9.5 3.5-13-1z" />
    {/* Flowing ornamental tail fin */}
    <path d="M16 11c2-3 5-5 6.5-4-1 2.5-1 4.5 0 6.5-1 2-1 4 0 6.5-1.5 1-4.5-1-6.5-4" />
    {/* Dorsal and ventral fins */}
    <path d="M9 7.5C10 5 13 4 15 5.5" />
    <path d="M9 16.5c1 2.5 4 3 6 1.5" />
    {/* Eye & Gill */}
    <circle cx="6.5" cy="11.5" r="1" fill="currentColor" />
    <path d="M10 10c1 1.2 1 2.8 0 4" />
  </svg>
);

// 18. Ouriço / Hedgehog (Radiant quill spines bristling on arched back, small snout, cute paws)
export const HedgehogVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Spiny quill points along the back */}
    <path d="M6 9l-2-2m4 0l-1-2.5m4 1.5L11 3m3.5 3.5L15 3.5m2.5 5L19 6m-1 5.5l2.5-1" />
    {/* Body contour */}
    <path d="M4 14c0-4.5 3.5-8 8.5-8 4.5 0 7.5 3 7.5 7.5 0 1-.2 1.8-.5 2.5H6c-1.2 0-2-1-2-2z" />
    {/* Pointed snout */}
    <path d="M19.5 16H22l-1.5-2" />
    <circle cx="21.5" cy="15.5" r="0.6" fill="currentColor" />
    {/* Eye & ear */}
    <circle cx="17" cy="13.5" r="1" fill="currentColor" />
    <path d="M15.5 12c0-1 .8-1.5 1.5-1" />
    {/* Paws */}
    <path d="M8 17.5v2" />
    <path d="M14 17.5v2" />
  </svg>
);

// 19. Outro animal de companhia (Exclusive companion fauna badge with caring heart and sparkle)
export const OtherCompanionVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    {/* Protective companion crest / shield */}
    <path d="M12 3L4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" />
    {/* Caring heart inside */}
    <path d="M12 9.5c-1.2-1.5-3.5-1.2-4 1-.6 2.2 2.5 4.5 4 5.5 1.5-1 4.6-3.3 4-5.5-.5-2.2-2.8-2.5-4-1z" />
    {/* Sparkle accent */}
    <path d="M18.5 2v3m-1.5-1.5h3" strokeWidth="1.5" />
  </svg>
);

// Fallbacks for generic broader categories (if passed from legacy or broad filters)
export const BirdGenericVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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

export const RodentGenericVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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

export const ReptileGenericVector: React.FC<SpeciesVectorProps> = ({ size = 20, className = '' }) => (
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
    <path d="M12 3c-2 0-3 1.5-3 3s1.5 3 3 4c1.5-1 3-2.5 3-4s-1-3-3-3z" />
    <path d="M12 10c-1 3-1 6 0 9s2 3 1 4" />
    <path d="M9 11L5 9" />
    <path d="M15 11l4-2" />
    <path d="M10 18L6 20" />
    <path d="M14 18l4 2" />
  </svg>
);

/**
 * Direct mapping between canonical species ID and its exclusive vector component.
 */
export const SPECIES_ICON_COMPONENTS: Record<string, React.FC<SpeciesVectorProps>> = {
  dog: DogVector,
  cat: CatVector,
  rabbit: RabbitVector,
  hamster: HamsterVector,
  guinea_pig: GuineaPigVector,
  ferret: FerretVector,
  rat: RatVector,
  cockatiel: CockatielVector,
  parrot: ParrotVector,
  parakeet: ParakeetVector,
  canary: CanaryVector,
  lovebird: LovebirdVector,
  turtle: TurtleVector,
  iguana: IguanaVector,
  gecko: GeckoVector,
  snake: SnakeVector,
  fish: FishVector,
  hedgehog: HedgehogVector,
  other: OtherCompanionVector,
  // Generic fallbacks
  bird: BirdGenericVector,
  rodent: RodentGenericVector,
  reptile: ReptileGenericVector,
};

/**
 * Retrieves the specific vector component for any species identifier.
 */
export function getSpeciesVectorComponent(speciesId?: string | null): React.FC<SpeciesVectorProps> {
  const norm = normalizeSpecies(speciesId);
  return SPECIES_ICON_COMPONENTS[norm] || OtherCompanionVector;
}

/**
 * Main SpeciesIcon component.
 * Renders the exclusive vector icon for each animal species in PetHub.
 */
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

  // 1. Canino (Cachorro)
  if (
    normalized === 'dog' ||
    normalized.includes('dog') ||
    normalized.includes('cao') ||
    normalized.includes('cão') ||
    normalized.includes('cachorr')
  ) {
    return <DogVector size={pixelSize} className={className} />;
  }

  // 2. Felino (Gato)
  if (normalized === 'cat' || normalized.includes('cat') || normalized.includes('gato') || normalized.includes('felino')) {
    return <CatVector size={pixelSize} className={className} />;
  }

  // 3. Coelho
  if (normalized === 'rabbit' || normalized.includes('rabbit') || normalized.includes('coelho')) {
    return <RabbitVector size={pixelSize} className={className} />;
  }

  // 4. Hamster
  if (normalized === 'hamster' || normalized.includes('hamster')) {
    return <HamsterVector size={pixelSize} className={className} />;
  }

  // 5. Porquinho-da-índia / Cobaia
  if (
    normalized === 'guinea_pig' ||
    normalized.includes('guinea') ||
    normalized.includes('porquinho') ||
    normalized.includes('cobaia')
  ) {
    return <GuineaPigVector size={pixelSize} className={className} />;
  }

  // 6. Furão / Ferret
  if (normalized === 'ferret' || normalized.includes('ferret') || normalized.includes('furao') || normalized.includes('furão')) {
    return <FerretVector size={pixelSize} className={className} />;
  }

  // 7. Rato doméstico / Twister
  if (
    normalized === 'rat' ||
    normalized.includes('rato') ||
    normalized.includes('twister')
  ) {
    return <RatVector size={pixelSize} className={className} />;
  }

  // 8. Calopsita
  if (normalized === 'cockatiel' || normalized.includes('calopsita') || normalized.includes('cockatiel')) {
    return <CockatielVector size={pixelSize} className={className} />;
  }

  // 9. Papagaio
  if (normalized === 'parrot' || normalized.includes('papagaio') || normalized.includes('parrot')) {
    return <ParrotVector size={pixelSize} className={className} />;
  }

  // 10. Periquito
  if (normalized === 'parakeet' || normalized.includes('periquito') || normalized.includes('parakeet')) {
    return <ParakeetVector size={pixelSize} className={className} />;
  }

  // 11. Canário
  if (normalized === 'canary' || normalized.includes('canario') || normalized.includes('canário') || normalized.includes('canary')) {
    return <CanaryVector size={pixelSize} className={className} />;
  }

  // 12. Agapornis
  if (normalized === 'lovebird' || normalized.includes('agapornis') || normalized.includes('lovebird')) {
    return <LovebirdVector size={pixelSize} className={className} />;
  }

  // 13. Tartaruga / Jabuti
  if (
    normalized === 'turtle' ||
    normalized.includes('tartaruga') ||
    normalized.includes('jabuti') ||
    normalized.includes('turtle')
  ) {
    return <TurtleVector size={pixelSize} className={className} />;
  }

  // 14. Iguana
  if (normalized === 'iguana' || normalized.includes('iguana')) {
    return <IguanaVector size={pixelSize} className={className} />;
  }

  // 15. Gecko
  if (normalized === 'gecko' || normalized.includes('gecko')) {
    return <GeckoVector size={pixelSize} className={className} />;
  }

  // 16. Serpente de estimação
  if (
    normalized === 'snake' ||
    normalized.includes('snake') ||
    normalized.includes('serpente') ||
    normalized.includes('cobra')
  ) {
    return <SnakeVector size={pixelSize} className={className} />;
  }

  // 17. Peixe ornamental
  if (normalized === 'fish' || normalized.includes('fish') || normalized.includes('peixe')) {
    return <FishVector size={pixelSize} className={className} />;
  }

  // 18. Ouriço
  if (
    normalized === 'hedgehog' ||
    normalized.includes('hedgehog') ||
    normalized.includes('ourico') ||
    normalized.includes('ouriço')
  ) {
    return <HedgehogVector size={pixelSize} className={className} />;
  }

  // Generic Aves fallback
  if (normalized === 'bird' || normalized.includes('ave') || normalized.includes('passaro') || normalized.includes('pássaro')) {
    return <BirdGenericVector size={pixelSize} className={className} />;
  }

  // Generic Roedores fallback
  if (
    normalized === 'rodent' ||
    normalized.includes('roedor') ||
    normalized.includes('chinchil') ||
    normalized.includes('gerbil')
  ) {
    return <RodentGenericVector size={pixelSize} className={className} />;
  }

  // Generic Répteis fallback
  if (normalized === 'reptile' || normalized.includes('reptil') || normalized.includes('réptil')) {
    return <ReptileGenericVector size={pixelSize} className={className} />;
  }

  // 19. Outro animal de companhia
  return <OtherCompanionVector size={pixelSize} className={className} />;
};

export default SpeciesIcon;
