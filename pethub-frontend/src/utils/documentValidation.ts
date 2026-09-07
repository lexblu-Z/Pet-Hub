/**
 * Document Validation & Masking Utility (CPF & CNPJ)
 * Implementation adhering strictly to Brazilian Federal Revenue modulo-11 verification algorithms.
 */

export function normalizeDocument(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Formats a raw or partial string as CPF: 000.000.000-00 (max 11 digits)
 */
export function formatCPF(value?: string | null): string {
  const digits = normalizeDocument(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formats a raw or partial string as CNPJ: 00.000.000/0000-00 (max 14 digits)
 */
export function formatCNPJ(value?: string | null): string {
  const digits = normalizeDocument(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Dynamically formats based on digit length (CPF up to 11 digits, CNPJ up to 14 digits)
 */
export function formatDocumentAuto(value?: string | null): string {
  const digits = normalizeDocument(value);
  if (digits.length <= 11) {
    return formatCPF(digits);
  }
  return formatCNPJ(digits);
}

/**
 * Validates CPF with official modulo-11 verification digits algorithm.
 */
export function validateCPF(cpfRaw?: string | null): { isValid: boolean; error?: string } {
  const digits = normalizeDocument(cpfRaw);

  if (!digits) {
    return { isValid: false, error: 'CPF é obrigatório.' };
  }

  if (digits.length !== 11) {
    return { isValid: false, error: 'O CPF deve conter exatamente 11 dígitos numéricos.' };
  }

  // Reject known invalid sequences with all equal digits
  if (/^(\d)\1{10}$/.test(digits)) {
    return { isValid: false, error: 'CPF inválido (dígitos repetidos).' };
  }

  // 1st Check Digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest >= 10 ? 0 : rest;

  if (digit1 !== parseInt(digits.charAt(9), 10)) {
    return { isValid: false, error: 'CPF inválido (dígito verificador incorreto).' };
  }

  // 2nd Check Digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest >= 10 ? 0 : rest;

  if (digit2 !== parseInt(digits.charAt(10), 10)) {
    return { isValid: false, error: 'CPF inválido (dígito verificador incorreto).' };
  }

  return { isValid: true };
}

/**
 * Validates CNPJ with official modulo-11 verification digits algorithm.
 */
export function validateCNPJ(cnpjRaw?: string | null): { isValid: boolean; error?: string } {
  const digits = normalizeDocument(cnpjRaw);

  if (!digits) {
    return { isValid: false, error: 'CNPJ é obrigatório.' };
  }

  if (digits.length !== 14) {
    return { isValid: false, error: 'O CNPJ deve conter exatamente 14 dígitos numéricos.' };
  }

  // Reject known invalid sequences
  if (/^(\d)\1{13}$/.test(digits)) {
    return { isValid: false, error: 'CNPJ inválido (dígitos repetidos).' };
  }

  // 1st Check Digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  let digit1 = rest < 2 ? 0 : 11 - rest;

  if (digit1 !== parseInt(digits.charAt(12), 10)) {
    return { isValid: false, error: 'CNPJ inválido (dígito verificador incorreto).' };
  }

  // 2nd Check Digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  let digit2 = rest < 2 ? 0 : 11 - rest;

  if (digit2 !== parseInt(digits.charAt(13), 10)) {
    return { isValid: false, error: 'CNPJ inválido (dígito verificador incorreto).' };
  }

  return { isValid: true };
}

/**
 * Validates either CPF or CNPJ based on length or specific role requirement.
 */
export function validateDocument(
  value?: string | null,
  type: 'cpf' | 'cnpj' | 'auto' = 'auto'
): { isValid: boolean; error?: string; normalized: string; type: 'cpf' | 'cnpj' | 'unknown' } {
  const normalized = normalizeDocument(value);

  if (type === 'cpf') {
    const val = validateCPF(normalized);
    return { ...val, normalized, type: 'cpf' };
  }

  if (type === 'cnpj') {
    const val = validateCNPJ(normalized);
    return { ...val, normalized, type: 'cnpj' };
  }

  // Auto
  if (normalized.length <= 11) {
    const val = validateCPF(normalized);
    return { ...val, normalized, type: 'cpf' };
  }
  const val = validateCNPJ(normalized);
  return { ...val, normalized, type: 'cnpj' };
}
