import { randomBytes } from 'crypto';

/**
 * Universal Cashback Rates for PetHub:
 * - Products: 3% of eligible amount
 * - Services: 5% of eligible amount
 */
export const CASHBACK_RATES = {
  PRODUCT: 0.03,
  SERVICE: 0.05,
} as const;

export const CURRENT_CASHBACK_TERMS_VERSION = '1.0';

export interface CashbackCalculation {
  cashbackAmount: number;
  rate: number;
  eligibleAmount: number;
}

/**
 * Calculates cashback with mathematical precision (2 decimal places, rounded half-up).
 * Eligible amount must never include previously applied cashback discounts.
 */
export function calculateCashback(
  arg1: 'PRODUCT' | 'SERVICE' | number,
  arg2: 'PRODUCT' | 'SERVICE' | number
): CashbackCalculation {
  let type: 'PRODUCT' | 'SERVICE';
  let eligibleAmount: number;

  if (typeof arg1 === 'number') {
    eligibleAmount = arg1;
    type = arg2 as 'PRODUCT' | 'SERVICE';
  } else {
    type = arg1 as 'PRODUCT' | 'SERVICE';
    eligibleAmount = arg2 as number;
  }

  const rate = CASHBACK_RATES[type] || (type === 'SERVICE' ? 0.05 : 0.03);
  const safeAmount = !eligibleAmount || eligibleAmount <= 0 ? 0 : Math.round(eligibleAmount * 100) / 100;
  const cashbackAmount = Math.round(safeAmount * rate * 100) / 100;

  return {
    cashbackAmount,
    rate,
    eligibleAmount: safeAmount,
  };
}

/**
 * Generates a cryptographically strong, high-entropy unique cashback voucher code.
 * Format: PHB-XXXX-XXXX-XXXX
 * Base32 alphanumeric alphabet without ambiguous characters (no 0/O, 1/I/L).
 * 32^12 = ~1.15 x 10^18 combinations (~60 bits of entropy).
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateSecureCashbackCode(): string {
  const bytes = randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    const idx = bytes[i] % CODE_ALPHABET.length;
    chars += CODE_ALPHABET[idx];
  }

  const p1 = chars.slice(0, 4);
  const p2 = chars.slice(4, 8);
  const p3 = chars.slice(8, 12);

  return `PHB-${p1}-${p2}-${p3}`;
}

export function normalizeCashbackCode(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().toUpperCase();
}
