import React from 'react';
import { 
  Droplets, Scissors, Stethoscope, Syringe, Home, 
  Sparkles, Award, Footprints, Activity, FileText, 
  Wrench, Package, ShoppingBag, CreditCard, DollarSign 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Normalization helper for deterministic semantic matching
 */
export function normalizeKey(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics (acentos)
    .replace(/[^a-z0-9]/g, ''); // alphanumeric only
}

export interface PaymentLogoDefinition {
  id: string;
  name: string;
  svgPath: string;
  type: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'generic';
}

/**
 * Official Payment Logos mapped to the remastered transparent vector assets from /uploads/pgmntos/
 */
export const PAYMENT_LOGO_MAP: Record<string, PaymentLogoDefinition> = {
  pix: {
    id: 'pix',
    name: 'Pix',
    svgPath: '/pgmntos/logo_pix.svg',
    type: 'pix',
  },
  credito: {
    id: 'credito',
    name: 'Cartão de Crédito',
    svgPath: '/pgmntos/credito.svg',
    type: 'credito',
  },
  debito: {
    id: 'debito',
    name: 'Cartão de Débito',
    svgPath: '/pgmntos/debito.svg',
    type: 'debito',
  },
  dinheiro: {
    id: 'dinheiro',
    name: 'Dinheiro',
    svgPath: '/pgmntos/dinheiro.svg',
    type: 'dinheiro',
  },
};

/**
 * Resolves the payment logo definition by analyzing code, method name or payment string
 */
export function resolvePaymentLogo(method?: string | null): PaymentLogoDefinition {
  const norm = normalizeKey(method);
  
  if (norm.includes('pix')) {
    return PAYMENT_LOGO_MAP.pix;
  }
  if (norm.includes('debito') || norm.includes('debit')) {
    return PAYMENT_LOGO_MAP.debito;
  }
  if (norm.includes('credito') || norm.includes('credit') || norm.includes('cartao') || norm.includes('card')) {
    return PAYMENT_LOGO_MAP.credito;
  }
  if (norm.includes('dinheiro') || norm.includes('cash') || norm.includes('especie')) {
    return PAYMENT_LOGO_MAP.dinheiro;
  }

  // Fallback to credit card for general cards / undefined
  return {
    id: 'generic',
    name: method || 'Pagamento',
    svgPath: '/pgmntos/credito.svg',
    type: 'generic',
  };
}

export interface ServiceLogoDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

/**
 * Centralized service semantic map using pure vector icons from Lucide React
 * Strictly conforms to ZERO EMOJIS rule.
 */
export const SERVICE_LOGO_MAP: Record<string, ServiceLogoDefinition> = {
  banho: {
    id: 'banho',
    label: 'Banho',
    icon: Droplets,
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-800/40',
  },
  tosa: {
    id: 'tosa',
    label: 'Tosa',
    icon: Scissors,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/60 dark:border-orange-800/40',
  },
  banhoetosa: {
    id: 'banhoetosa',
    label: 'Banho e Tosa',
    icon: Scissors,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/60 dark:border-orange-800/40',
  },
  veterinario: {
    id: 'veterinario',
    label: 'Veterinário',
    icon: Stethoscope,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40',
  },
  consulta: {
    id: 'consulta',
    label: 'Consulta',
    icon: Stethoscope,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40',
  },
  vacinacao: {
    id: 'vacinacao',
    label: 'Vacinação',
    icon: Syringe,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40',
  },
  vacina: {
    id: 'vacina',
    label: 'Vacina',
    icon: Syringe,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40',
  },
  hospedagem: {
    id: 'hospedagem',
    label: 'Hospedagem',
    icon: Home,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40',
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel Pet',
    icon: Home,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40',
  },
  creche: {
    id: 'creche',
    label: 'Creche',
    icon: Sparkles,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40',
  },
  daycare: {
    id: 'daycare',
    label: 'Daycare',
    icon: Sparkles,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40',
  },
  adestramento: {
    id: 'adestramento',
    label: 'Adestramento',
    icon: Award,
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200/60 dark:border-yellow-800/40',
  },
  passeio: {
    id: 'passeio',
    label: 'Passeio',
    icon: Footprints,
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40',
  },
  cirurgia: {
    id: 'cirurgia',
    label: 'Cirurgia',
    icon: Activity,
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40',
  },
  exame: {
    id: 'exame',
    label: 'Exames',
    icon: FileText,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40',
  },
  produto: {
    id: 'produto',
    label: 'Produto',
    icon: Package,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/60 dark:border-orange-800/40',
  },
};

/**
 * Deterministically resolves a service's semantic logo definition
 */
export function resolveServiceLogo(category?: string | null, name?: string | null): ServiceLogoDefinition {
  const normCat = normalizeKey(category);
  const normName = normalizeKey(name);

  // Exact key in category
  if (normCat && SERVICE_LOGO_MAP[normCat]) {
    return SERVICE_LOGO_MAP[normCat];
  }

  // Common composite match: 'banhoetosa'
  if (normCat.includes('banho') && normCat.includes('tosa')) {
    return SERVICE_LOGO_MAP.banhoetosa;
  }
  if (normName.includes('banho') && normName.includes('tosa')) {
    return SERVICE_LOGO_MAP.banhoetosa;
  }

  // Priority check on category keywords
  for (const [key, def] of Object.entries(SERVICE_LOGO_MAP)) {
    if (normCat.includes(key)) {
      return def;
    }
  }

  // Priority check on service name keywords
  for (const [key, def] of Object.entries(SERVICE_LOGO_MAP)) {
    if (normName.includes(key)) {
      return def;
    }
  }

  // Elegant fallback: Sparkles with clean theme
  return {
    id: 'outro',
    label: name || category || 'Serviço',
    icon: Sparkles,
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-neutral-100 dark:bg-[#282A2C] border-neutral-200 dark:border-[#313335]',
  };
}
