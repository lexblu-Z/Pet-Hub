/**
 * speciesAgeRules.ts
 * 
 * Centralized biological age classification, exact calendar arithmetic without timezone drift,
 * and species-tailored life stages for all animal groups supported by PetHub.
 * 
 * Prohibits any generic universal rules (e.g. 0-1 puppy, 2-7 adult, 8+ senior)
 * and accurately represents the real life expectancies of diverse companion animals
 * (e.g., Turtles live 50-100+ years and are NOT senior at 12 years; Parrots live 50-70 years;
 * Hamsters live 2-3 years and are senior at 18 months).
 */

export interface LifeStage {
  minYears: number;
  maxYears: number;
  stage: 'puppy' | 'young_adult' | 'adult' | 'senior' | 'elderly';
  label: string;
  badgeVariant: 'info' | 'success' | 'warning' | 'neutral';
}

export interface SpeciesAgeRule {
  speciesId: string;
  family: string;
  lifeExpectancyYears: number;
  stages: LifeStage[];
  approximateAgeOptions: string[];
}

// 1. Dog (Canis lupus familiaris) - Expectancy: 10-15 years
const DOG_RULES: SpeciesAgeRule = {
  speciesId: 'dog',
  family: 'Canídeos',
  lifeExpectancyYears: 13,
  stages: [
    { minYears: 0, maxYears: 1, stage: 'puppy', label: 'Filhote', badgeVariant: 'info' },
    { minYears: 1, maxYears: 7, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 7, maxYears: 11, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 11, maxYears: 30, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 6 meses)',
    'Filhote (6 meses a 1 ano)',
    'Adulto jovem (1 a 3 anos)',
    'Adulto (4 a 7 anos)',
    'Sênior (8 a 11 anos)',
    'Idoso (mais de 12 anos)',
  ],
};

// 2. Cat (Felis catus) - Expectancy: 12-18 years
const CAT_RULES: SpeciesAgeRule = {
  speciesId: 'cat',
  family: 'Felídeos',
  lifeExpectancyYears: 15,
  stages: [
    { minYears: 0, maxYears: 1, stage: 'puppy', label: 'Filhote', badgeVariant: 'info' },
    { minYears: 1, maxYears: 6, stage: 'young_adult', label: 'Adulto jovem', badgeVariant: 'success' },
    { minYears: 6, maxYears: 10, stage: 'adult', label: 'Adulto pleno', badgeVariant: 'success' },
    { minYears: 10, maxYears: 14, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 14, maxYears: 30, stage: 'elderly', label: 'Idoso / Geriátrico', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 6 meses)',
    'Filhote (6 meses a 1 ano)',
    'Adulto jovem (1 a 6 anos)',
    'Adulto maduro (7 a 10 anos)',
    'Sênior (11 a 14 anos)',
    'Idoso / Geriátrico (mais de 15 anos)',
  ],
};

// 3. Turtle / Tortoise / Jabuti (Testudines) - Expectancy: 50-100+ years
// A 12-year-old turtle is young adult / juvenil, NEVER senior!
const TURTLE_RULES: SpeciesAgeRule = {
  speciesId: 'turtle',
  family: 'Quelônios / Répteis',
  lifeExpectancyYears: 80,
  stages: [
    { minYears: 0, maxYears: 5, stage: 'puppy', label: 'Filhote / Juvenil', badgeVariant: 'info' },
    { minYears: 5, maxYears: 20, stage: 'young_adult', label: 'Adulto jovem', badgeVariant: 'success' },
    { minYears: 20, maxYears: 45, stage: 'adult', label: 'Adulto pleno', badgeVariant: 'success' },
    { minYears: 45, maxYears: 65, stage: 'senior', label: 'Adulto maduro / Longevo', badgeVariant: 'warning' },
    { minYears: 65, maxYears: 150, stage: 'elderly', label: 'Idoso / Centenário', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote / Juvenil (até 5 anos)',
    'Adulto jovem (6 a 15 anos)',
    'Adulto pleno (16 a 35 anos)',
    'Adulto maduro (36 a 50 anos)',
    'Idoso / Longevo (mais de 50 anos)',
  ],
};

// 4. Large Birds (Parrots / Papagaios - Psittacidae) - Expectancy: 50-70 years
const PARROT_RULES: SpeciesAgeRule = {
  speciesId: 'parrot',
  family: 'Psitacídeos Grandes',
  lifeExpectancyYears: 60,
  stages: [
    { minYears: 0, maxYears: 2, stage: 'puppy', label: 'Filhote / Jovem', badgeVariant: 'info' },
    { minYears: 2, maxYears: 15, stage: 'young_adult', label: 'Adulto jovem', badgeVariant: 'success' },
    { minYears: 15, maxYears: 35, stage: 'adult', label: 'Adulto pleno', badgeVariant: 'success' },
    { minYears: 35, maxYears: 50, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 50, maxYears: 100, stage: 'elderly', label: 'Idoso / Longevo', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote / Jovem (até 2 anos)',
    'Adulto jovem (3 a 10 anos)',
    'Adulto pleno (11 a 30 anos)',
    'Sênior (31 a 50 anos)',
    'Idoso / Longevo (mais de 50 anos)',
  ],
};

// 5. Small/Medium Birds (Cockatiel, Parakeet, Canary, Lovebird) - Expectancy: 10-20 years
const MEDIUM_BIRD_RULES: SpeciesAgeRule = {
  speciesId: 'cockatiel',
  family: 'Aves de Médio/Pequeno Porte',
  lifeExpectancyYears: 16,
  stages: [
    { minYears: 0, maxYears: 1, stage: 'puppy', label: 'Filhote', badgeVariant: 'info' },
    { minYears: 1, maxYears: 8, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 8, maxYears: 12, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 12, maxYears: 30, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 1 ano)',
    'Adulto jovem (1 a 4 anos)',
    'Adulto (5 a 8 anos)',
    'Sênior (9 a 12 anos)',
    'Idoso (mais de 12 anos)',
  ],
};

// 6. Rabbit (Oryctolagus cuniculus) - Expectancy: 8-12 years
const RABBIT_RULES: SpeciesAgeRule = {
  speciesId: 'rabbit',
  family: 'Lagomorfos',
  lifeExpectancyYears: 10,
  stages: [
    { minYears: 0, maxYears: 0.6, stage: 'puppy', label: 'Filhote', badgeVariant: 'info' },
    { minYears: 0.6, maxYears: 5, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 5, maxYears: 8, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 8, maxYears: 18, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 6 meses)',
    'Adulto jovem (6 meses a 2 anos)',
    'Adulto (3 a 5 anos)',
    'Sênior (6 a 8 anos)',
    'Idoso (mais de 8 anos)',
  ],
};

// 7. Small Rodents (Hamster, Rat) - Expectancy: 2-3 years
const SMALL_RODENT_RULES: SpeciesAgeRule = {
  speciesId: 'hamster',
  family: 'Pequenos Roedores',
  lifeExpectancyYears: 2.5,
  stages: [
    { minYears: 0, maxYears: 0.25, stage: 'puppy', label: 'Filhote (até 3 meses)', badgeVariant: 'info' },
    { minYears: 0.25, maxYears: 1.5, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 1.5, maxYears: 2.2, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 2.2, maxYears: 6, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (até 3 meses)',
    'Adulto jovem (4 a 12 meses)',
    'Adulto pleno (13 a 18 meses)',
    'Sênior / Idoso (mais de 18 meses)',
  ],
};

// 8. Medium Rodents & Small Carnivores (Guinea Pig, Ferret, Hedgehog) - Expectancy: 5-8 years
const MEDIUM_RODENT_RULES: SpeciesAgeRule = {
  speciesId: 'guinea_pig',
  family: 'Roedores Médios e Mustelídeos',
  lifeExpectancyYears: 7,
  stages: [
    { minYears: 0, maxYears: 0.5, stage: 'puppy', label: 'Filhote', badgeVariant: 'info' },
    { minYears: 0.5, maxYears: 4, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 4, maxYears: 6, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 6, maxYears: 14, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 6 meses)',
    'Adulto jovem (6 meses a 2 anos)',
    'Adulto (3 a 4 anos)',
    'Sênior (5 a 6 anos)',
    'Idoso (mais de 6 anos)',
  ],
};

// 9. Other Reptiles (Iguana, Gecko, Snake) - Expectancy: 15-25 years
const REPTILE_RULES: SpeciesAgeRule = {
  speciesId: 'reptile',
  family: 'Répteis Escamados',
  lifeExpectancyYears: 18,
  stages: [
    { minYears: 0, maxYears: 2, stage: 'puppy', label: 'Filhote / Juvenil', badgeVariant: 'info' },
    { minYears: 2, maxYears: 11, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 11, maxYears: 16, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 16, maxYears: 40, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote / Juvenil (até 2 anos)',
    'Adulto jovem (3 a 6 anos)',
    'Adulto pleno (7 a 11 anos)',
    'Sênior (12 a 15 anos)',
    'Idoso (mais de 16 anos)',
  ],
};

// 10. Ornamental Fish - Expectancy: 3-10 years
const FISH_RULES: SpeciesAgeRule = {
  speciesId: 'fish',
  family: 'Peixes Ornamentais',
  lifeExpectancyYears: 5,
  stages: [
    { minYears: 0, maxYears: 0.5, stage: 'puppy', label: 'Alevino / Jovem', badgeVariant: 'info' },
    { minYears: 0.5, maxYears: 2.5, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 2.5, maxYears: 5, stage: 'senior', label: 'Adulto maduro', badgeVariant: 'warning' },
    { minYears: 5, maxYears: 20, stage: 'elderly', label: 'Longevo', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Alevino / Jovem (até 6 meses)',
    'Adulto (6 meses a 2 anos)',
    'Adulto pleno (3 a 4 anos)',
    'Longevo / Sênior (5+ anos)',
  ],
};

// 11. General Companion Animals Fallback
const OTHER_RULES: SpeciesAgeRule = {
  speciesId: 'other',
  family: 'Outros Animais de Companhia',
  lifeExpectancyYears: 12,
  stages: [
    { minYears: 0, maxYears: 1, stage: 'puppy', label: 'Filhote / Jovem', badgeVariant: 'info' },
    { minYears: 1, maxYears: 7, stage: 'adult', label: 'Adulto', badgeVariant: 'success' },
    { minYears: 7, maxYears: 10, stage: 'senior', label: 'Sênior', badgeVariant: 'warning' },
    { minYears: 10, maxYears: 25, stage: 'elderly', label: 'Idoso', badgeVariant: 'neutral' },
  ],
  approximateAgeOptions: [
    'Filhote (menos de 1 ano)',
    'Adulto jovem (1 a 3 anos)',
    'Adulto (4 a 7 anos)',
    'Sênior (8 a 10 anos)',
    'Idoso (mais de 10 anos)',
  ],
};

/**
 * Maps any species ID or string identifier to its respective biological rule set.
 */
export function getSpeciesAgeRule(speciesIdRaw?: string | null): SpeciesAgeRule {
  const norm = (speciesIdRaw || '').toLowerCase().trim();

  // Turtle / Jabuti / Testudines
  if (norm.includes('turtle') || norm.includes('tartaruga') || norm.includes('jabuti') || norm.includes('cagado')) {
    return TURTLE_RULES;
  }

  // Felines
  if (norm.includes('cat') || norm.includes('gato') || norm.includes('felino')) {
    return CAT_RULES;
  }

  // Large Birds / Parrots
  if (norm.includes('parrot') || norm.includes('papagaio') || norm.includes('arara')) {
    return PARROT_RULES;
  }

  // Medium / Small Birds
  if (
    norm.includes('cockatiel') ||
    norm.includes('calopsita') ||
    norm.includes('parakeet') ||
    norm.includes('periquito') ||
    norm.includes('canary') ||
    norm.includes('canario') ||
    norm.includes('lovebird') ||
    norm.includes('agapornis') ||
    norm.includes('bird') ||
    norm.includes('ave') ||
    norm.includes('passaro')
  ) {
    return MEDIUM_BIRD_RULES;
  }

  // Rabbits
  if (norm.includes('rabbit') || norm.includes('coelho')) {
    return RABBIT_RULES;
  }

  // Small Rodents
  if (norm.includes('hamster') || norm.includes('rat') || norm.includes('chinchil')) {
    return SMALL_RODENT_RULES;
  }

  // Medium Rodents & Small Carnivores
  if (
    norm.includes('guinea_pig') ||
    norm.includes('porquinho') ||
    norm.includes('cobaia') ||
    norm.includes('ferret') ||
    norm.includes('furao') ||
    norm.includes('hedgehog') ||
    norm.includes('ourico') ||
    norm.includes('rodent')
  ) {
    return MEDIUM_RODENT_RULES;
  }

  // Other Reptiles
  if (
    norm.includes('iguana') ||
    norm.includes('gecko') ||
    norm.includes('snake') ||
    norm.includes('serpente') ||
    norm.includes('cobra') ||
    norm.includes('reptile') ||
    norm.includes('lagarto')
  ) {
    return REPTILE_RULES;
  }

  // Fish
  if (norm.includes('fish') || norm.includes('peixe')) {
    return FISH_RULES;
  }

  // Dogs
  if (norm.includes('dog') || norm.includes('cao') || norm.includes('cachorr')) {
    return DOG_RULES;
  }

  return OTHER_RULES;
}

/**
 * Returns dynamic approximate age options tailored specifically to the pet's species.
 */
export function getApproximateAgeOptions(speciesIdRaw?: string | null): string[] {
  const rule = getSpeciesAgeRule(speciesIdRaw);
  return rule.approximateAgeOptions;
}

export interface ExactAgeResult {
  years: number;
  months: number;
  days: number;
  totalYearsFloat: number;
  formatted: string;
}

/**
 * Calculates exact calendar age from a birth date string without timezone drift
 * and without introducing a 1-year rounding error before birthday completion.
 */
export function calculateExactAge(birthDateInput: string | Date, referenceDate: Date = new Date()): ExactAgeResult {
  let birthYear: number;
  let birthMonth: number; // 0-indexed
  let birthDay: number;

  if (typeof birthDateInput === 'string') {
    // Standard ISO format YYYY-MM-DD
    const parts = birthDateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      birthYear = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10) - 1;
      birthDay = parseInt(parts[2], 10);
    } else {
      const parsed = new Date(birthDateInput);
      birthYear = parsed.getFullYear();
      birthMonth = parsed.getMonth();
      birthDay = parsed.getDate();
    }
  } else {
    birthYear = birthDateInput.getFullYear();
    birthMonth = birthDateInput.getMonth();
    birthDay = birthDateInput.getDate();
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  let years = refYear - birthYear;
  let months = refMonth - birthMonth;
  let days = refDay - birthDay;

  if (days < 0) {
    months--;
    // Days in previous month
    const daysInPrevMonth = new Date(refYear, refMonth, 0).getDate();
    days += daysInPrevMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  // Safeguard against future dates
  if (years < 0) {
    return { years: 0, months: 0, days: 0, totalYearsFloat: 0, formatted: '0 dias' };
  }

  const totalYearsFloat = Math.max(0, years + months / 12 + days / 365.25);

  let formatted = '';
  if (years === 0) {
    if (months === 0) {
      formatted = `${days} ${days === 1 ? 'dia' : 'dias'}`;
    } else {
      formatted = `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
  } else if (years === 1 && months === 0) {
    formatted = '1 ano';
  } else if (years < 2 && months > 0) {
    formatted = `${years} ano e ${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    formatted = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }

  return {
    years,
    months,
    days,
    totalYearsFloat,
    formatted,
  };
}

/**
 * Classifies a pet's life stage strictly according to its species biological rules.
 */
export function classifyAgeStage(speciesIdRaw: string | null | undefined, ageInYears: number): LifeStage {
  const rule = getSpeciesAgeRule(speciesIdRaw);
  const found = rule.stages.find((st) => ageInYears >= st.minYears && ageInYears < st.maxYears);
  return found || rule.stages[rule.stages.length - 1];
}

/**
 * Universal formatter for displaying pet age across cards, profiles, tables, and reports.
 */
export function formatPetAgeDisplay(pet: {
  species?: string | null;
  birthDate?: string | Date | null;
  approximateAge?: string | null;
}): string {
  if (pet.birthDate) {
    const age = calculateExactAge(pet.birthDate);
    const stage = classifyAgeStage(pet.species, age.totalYearsFloat);
    return `${age.formatted} · ${stage.label}`;
  }

  if (pet.approximateAge && pet.approximateAge.trim()) {
    return pet.approximateAge.trim();
  }

  return 'Idade não informada';
}
