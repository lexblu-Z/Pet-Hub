export interface SpeciesOption {
  id: string;
  label: string;
  emoji: string;
  category: 'dog' | 'cat' | 'bird' | 'rabbit' | 'rodent' | 'reptile' | 'fish' | 'other';
}

export const SPECIES_OPTIONS: SpeciesOption[] = [
  { id: 'dog', label: 'Cachorro', emoji: '🐶', category: 'dog' },
  { id: 'cat', label: 'Gato', emoji: '🐱', category: 'cat' },
  { id: 'rabbit', label: 'Coelho', emoji: '🐰', category: 'rabbit' },
  { id: 'hamster', label: 'Hamster', emoji: '🐹', category: 'rodent' },
  { id: 'guinea_pig', label: 'Porquinho-da-índia', emoji: '🐹', category: 'rodent' },
  { id: 'ferret', label: 'Furão', emoji: '🦡', category: 'rodent' },
  { id: 'rat', label: 'Rato doméstico', emoji: '🐁', category: 'rodent' },
  { id: 'cockatiel', label: 'Calopsita', emoji: '🦜', category: 'bird' },
  { id: 'parrot', label: 'Papagaio', emoji: '🦜', category: 'bird' },
  { id: 'parakeet', label: 'Periquito', emoji: '🦜', category: 'bird' },
  { id: 'canary', label: 'Canário', emoji: '🐤', category: 'bird' },
  { id: 'lovebird', label: 'Agapornis', emoji: '🦜', category: 'bird' },
  { id: 'turtle', label: 'Tartaruga / Jabuti', emoji: '🐢', category: 'reptile' },
  { id: 'iguana', label: 'Iguana', emoji: '🦎', category: 'reptile' },
  { id: 'gecko', label: 'Gecko', emoji: '🦎', category: 'reptile' },
  { id: 'snake', label: 'Serpente de estimação', emoji: '🐍', category: 'reptile' },
  { id: 'fish', label: 'Peixe ornamental', emoji: '🐠', category: 'fish' },
  { id: 'hedgehog', label: 'Ouriço', emoji: '🦔', category: 'rodent' },
  { id: 'other', label: 'Outro animal de companhia', emoji: '🐾', category: 'other' },
];

export const SPECIES_LABELS: Record<string, string> = SPECIES_OPTIONS.reduce((acc, curr) => {
  acc[curr.id] = curr.label;
  return acc;
}, {} as Record<string, string>);

export const SPECIES_EMOJIS: Record<string, string> = SPECIES_OPTIONS.reduce((acc, curr) => {
  acc[curr.id] = curr.emoji;
  return acc;
}, {} as Record<string, string>);

export const COMMON_BREEDS: Record<string, string[]> = {
  dog: [
    'SRD (Sem Raça Definida)',
    'Akita',
    'Beagle',
    'Bernese Mountain Dog',
    'Bichon Frisé',
    'Border Collie',
    'Boston Terrier',
    'Boxer',
    'Buldogue Francês',
    'Buldogue Inglês',
    'Bull Terrier',
    'Cane Corso',
    'Cavalier King Charles',
    'Chihuahua',
    'Chow Chow',
    'Cocker Spaniel',
    'Dachshund (Salsicha)',
    'Dálmata',
    'Doberman',
    'Dogo Argentino',
    'Golden Retriever',
    'Husky Siberiano',
    'Jack Russell Terrier',
    'Labrador Retriever',
    'Lhasa Apso',
    'Lulu da Pomerânia (Spitz Alemão)',
    'Maltês',
    'Mastiff',
    'Pastor Alemão',
    'Pastor Australiano',
    'Pastor Belga Malinois',
    'Pastor Suíço',
    'Pinscher',
    'Pitbull (American Pit Bull Terrier)',
    'Poodle',
    'Pug',
    'Rottweiler',
    'Samoieda',
    'Schnauzer',
    'Shar Pei',
    'Shih Tzu',
    'Staffordshire Bull Terrier',
    'Weimaraner',
    'Whippet',
    'Yorkshire Terrier',
  ],
  cat: [
    'SRD (Sem Raça Definida)',
    'Abissínio',
    'American Shorthair',
    'Angorá Turco',
    'Azul Russo',
    'Bengal',
    'Birmanês (Sagrado da Birmânia)',
    'British Shorthair',
    'Chartreux',
    'Cornish Rex',
    'Devon Rex',
    'Exótico',
    'Himalaio',
    'Maine Coon',
    'Munchkin',
    'Norueguês da Floresta',
    'Persa',
    'Ragdoll',
    'Savannah',
    'Scottish Fold',
    'Siamês',
    'Siberiano',
    'Sphynx',
    'Tonquês',
  ],
  rabbit: [
    'SRD (Sem Raça Definida)',
    'Mini Lion',
    'Mini Lop',
    'Holandês (Netherland Dwarf)',
    'Flemish Giant (Gigante de Flandres)',
    'Rex',
    'Cabeça de Leão (Lionhead)',
    'Angorá Inglês',
    'Fuzzy Lop',
    'Chinchila (Coelho)',
  ],
  hamster: [
    'Sírio',
    'Anão Russo Campbell',
    'Anão Russo Winter White',
    'Roborovski',
    'Chinês',
  ],
  guinea_pig: [
    'Inglês (Pêlo Curto)',
    'Abissínio',
    'Peruano',
    'Sheltie',
    'Teddy',
    'Coronet',
  ],
  ferret: [
    'Standard (Padrão)',
    'Sable',
    'Albino',
    'Canela (Cinnamon)',
    'Silver',
  ],
  rat: [
    'Twister Standard',
    'Dumbo',
    'Rex',
    'Hairless (Sem pelo)',
  ],
  cockatiel: [
    'Silvestre (Cinza)',
    'Lutino',
    'Cara Branca',
    'Pérola',
    'Canela',
    'Albino',
    'Arlequim',
  ],
  parrot: [
    'Papagaio-verdadeiro',
    'Papagaio-do-mangue',
    'Papagaio-do-peito-roxo',
    'Papagaio-galego',
  ],
  parakeet: [
    'Periquito Australiano Comum',
    'Periquito Australiano Padrão Inglês',
    'Periquito-verde',
    'Periquito Catarina',
  ],
  canary: [
    'Canário Belga',
    'Canário da Terra',
    'Canário Gloster',
    'Canário Roller',
    'Canário Harz',
  ],
  lovebird: [
    'Agapornis Roseicollis',
    'Agapornis Personatus',
    'Agapornis Fischeri',
  ],
  turtle: [
    'Jabuti-piranga',
    'Jabuti-tinga',
    'Tigre-d\'água brasileiro',
    'Tartaruga-de-orelha-vermelha',
  ],
  iguana: [
    'Iguana Verde (Green Iguana)',
    'Iguana Azul',
    'Iguana Vermelha',
  ],
  gecko: [
    'Gecko Leopardo (Leopard Gecko)',
    'Crested Gecko (Gecko de Crista)',
    'Tokay Gecko',
  ],
  snake: [
    'Corn Snake (Cobra-do-milho)',
    'Ball Python (Píton-real)',
    'Jiboia Arco-íris',
    'Falsa-coral',
  ],
  fish: [
    'Betta Splendens',
    'Guppy (Lebiste)',
    'Kinguio (Peixe Dourado)',
    'Carpa Ornamental (Koi)',
    'Acará-disco',
    'Tetra-néon',
    'Molinésia',
    'Plati',
    'Espada',
  ],
  hedgehog: [
    'Ouriço Pigmeu Africano',
    'Ouriço Europeu',
  ],
  bird: [
    'Calopsita',
    'Canário',
    'Periquito Australiano',
    'Papagaio Verdadeiro',
    'Agapornis',
    'Cacatua',
    'Caturrita',
    'Manon',
    'Diamante de Gould',
    'Trinca-Ferro',
    'Coleiro',
    'Outra Ave',
  ],
  rodent: [
    'Hamster Sírio',
    'Hamster Anão Russo',
    'Porquinho da Índia',
    'Chinchila',
    'Gerbil',
    'Rato Twister',
    'Furão',
    'Outro Roedor',
  ],
  other: [
    'Outro',
  ],
};

/**
 * Normalizes any species string representation (pt/en, variations, casing) into a canonical species ID.
 */
export function normalizeSpecies(raw?: string | null): string {
  if (!raw) return 'other';
  const clean = raw.trim().toLowerCase();

  // Exact option match
  const option = SPECIES_OPTIONS.find(
    o => o.id.toLowerCase() === clean || o.label.toLowerCase() === clean
  );
  if (option) return option.id;

  // Dogs
  if (['dog', 'cachorro', 'cão', 'cao', 'canino', 'cães', 'caes'].includes(clean)) return 'dog';
  // Cats
  if (['cat', 'gato', 'gata', 'felino', 'gatos'].includes(clean)) return 'cat';
  // Rabbits
  if (['rabbit', 'coelho', 'coelha', 'coelhos'].includes(clean)) return 'rabbit';
  // Hamster
  if (['hamster', 'hamsters'].includes(clean)) return 'hamster';
  // Guinea pig
  if (['guinea_pig', 'porquinho-da-índia', 'porquinho da india', 'porquinho da índia', 'cavia'].includes(clean)) return 'guinea_pig';
  // Ferret
  if (['ferret', 'furão', 'furao'].includes(clean)) return 'ferret';
  // Rat
  if (['rat', 'rato', 'rato doméstico', 'rato domestico', 'twister'].includes(clean)) return 'rat';
  // Birds
  if (['cockatiel', 'calopsita'].includes(clean)) return 'cockatiel';
  if (['parrot', 'papagaio'].includes(clean)) return 'parrot';
  if (['parakeet', 'periquito'].includes(clean)) return 'parakeet';
  if (['canary', 'canário', 'canario'].includes(clean)) return 'canary';
  if (['lovebird', 'agapornis'].includes(clean)) return 'lovebird';
  if (['bird', 'ave', 'aves', 'pássaro', 'passaro', 'pássaros', 'passaros'].includes(clean)) return 'bird';
  // Reptiles
  if (['turtle', 'tartaruga', 'jabuti'].includes(clean)) return 'turtle';
  if (['iguana'].includes(clean)) return 'iguana';
  if (['gecko'].includes(clean)) return 'gecko';
  if (['snake', 'serpente', 'cobra'].includes(clean)) return 'snake';
  // Fish
  if (['fish', 'peixe', 'peixes'].includes(clean)) return 'fish';
  // Hedgehog
  if (['hedgehog', 'ouriço', 'ourico'].includes(clean)) return 'hedgehog';
  // Rodent generic
  if (['rodent', 'roedor', 'roedores', 'chinchila', 'gerbil'].includes(clean)) return 'rodent';

  return 'other';
}

/**
 * Gets high-level category of species for broader compatibility matching.
 */
export function getSpeciesCategory(speciesRaw?: string | null): string {
  const norm = normalizeSpecies(speciesRaw);
  const opt = SPECIES_OPTIONS.find(o => o.id === norm);
  if (opt) return opt.category;

  if (norm === 'bird') return 'bird';
  if (norm === 'rodent') return 'rodent';
  return 'other';
}

/**
 * Returns display info (label, emoji) for a given species key.
 */
export function getSpeciesInfo(speciesRaw?: string | null): { id: string; label: string; emoji: string } {
  const norm = normalizeSpecies(speciesRaw);
  const found = SPECIES_OPTIONS.find(s => s.id === norm);
  if (found) {
    return { id: found.id, label: found.label, emoji: found.emoji };
  }
  return { id: norm, label: norm, emoji: '🐾' };
}

/**
 * Searches breeds strictly mapped to the given species.
 */
export function searchBreedsBySpecies(speciesRaw: string, query: string): string[] {
  const speciesKey = normalizeSpecies(speciesRaw);
  const list = COMMON_BREEDS[speciesKey] 
    || COMMON_BREEDS[getSpeciesCategory(speciesRaw)] 
    || ['SRD (Sem Raça Definida)', 'Outra'];

  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return list;
  return list.filter(b => b.toLowerCase().includes(cleanQ));
}

/**
 * Formats badges for accepted species in cards and profiles.
 */
export function formatAcceptedSpeciesBadges(acceptedSpeciesRaw?: string[] | null): string {
  if (!acceptedSpeciesRaw || acceptedSpeciesRaw.length === 0) {
    return 'Cachorros • Gatos';
  }
  const unique = Array.from(new Set(acceptedSpeciesRaw.map(s => normalizeSpecies(s))));
  return unique.map(k => {
    const info = getSpeciesInfo(k);
    return info.label;
  }).join(' • ');
}

/**
 * Checks if a pet species is compatible with a service's animalType.
 */
export function isPetCompatibleWithService(petSpeciesRaw?: string | null, serviceAnimalTypeRaw?: string | null): boolean {
  if (!serviceAnimalTypeRaw) return true;
  const cleanService = serviceAnimalTypeRaw.trim().toLowerCase();
  if (['all', 'todos', 'ambos', 'qualquer', 'todas'].includes(cleanService)) {
    return true;
  }

  const petId = normalizeSpecies(petSpeciesRaw);
  const petCat = getSpeciesCategory(petSpeciesRaw);
  const serviceId = normalizeSpecies(serviceAnimalTypeRaw);
  const serviceCat = getSpeciesCategory(serviceAnimalTypeRaw);

  return petId === serviceId || petCat === serviceId || petCat === serviceCat || petId === serviceCat;
}

/**
 * Checks if a pet species is compatible with a provider's (establishment or professional) accepted species.
 */
export function isPetCompatibleWithProvider(petSpeciesRaw?: string | null, acceptedSpeciesRaw?: string[] | null): boolean {
  const petId = normalizeSpecies(petSpeciesRaw);
  const petCat = getSpeciesCategory(petSpeciesRaw);

  if (!acceptedSpeciesRaw || acceptedSpeciesRaw.length === 0) {
    return petCat === 'dog' || petCat === 'cat';
  }

  return acceptedSpeciesRaw.some(acc => {
    const accId = normalizeSpecies(acc);
    const accCat = getSpeciesCategory(acc);
    return petId === accId || petCat === accId || petCat === accCat || petId === accCat;
  });
}

/**
 * Returns a human-friendly label for a service's animalType filter.
 */
export function getAnimalTypeLabel(type?: string | null): string {
  if (!type || ['all', 'todos', 'ambos', 'qualquer', 'todas'].includes(type.trim().toLowerCase())) {
    return 'Todas as espécies';
  }
  const info = getSpeciesInfo(type);
  return info.label || type;
}

/**
 * Returns a high quality species-tailored photo fallback for pets without a custom photo.
 */
export function getSpeciesFallbackAvatar(speciesRaw?: string | null): string {
  const norm = normalizeSpecies(speciesRaw);
  if (norm === 'cat') {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop';
  }
  if (
    norm === 'bird' ||
    norm === 'cockatiel' ||
    norm === 'parrot' ||
    norm === 'parakeet' ||
    norm === 'canary' ||
    norm === 'lovebird'
  ) {
    return 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?q=80&w=600&auto=format&fit=crop';
  }
  if (
    norm === 'rabbit' ||
    norm === 'rodent' ||
    norm === 'hamster' ||
    norm === 'guinea_pig' ||
    norm === 'ferret' ||
    norm === 'rat' ||
    norm === 'hedgehog'
  ) {
    return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=80&w=600&auto=format&fit=crop';
  }
  if (
    norm === 'turtle' ||
    norm === 'reptile' ||
    norm === 'iguana' ||
    norm === 'gecko' ||
    norm === 'snake'
  ) {
    return 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?q=80&w=600&auto=format&fit=crop';
  }
  if (norm === 'fish') {
    return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=600&auto=format&fit=crop';
  }
  if (norm === 'dog') {
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=600&auto=format&fit=crop';
}

