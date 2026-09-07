/**
 * Document Validation & Masking Utility (CPF & CNPJ) - Backend Engine
 * Strict verification of Brazilian tax IDs using official modulo-11 verification algorithms.
 */

export function normalizeDocument(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
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

  // Reject known invalid sequences
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

export function validateAndNormalizeDocument(
  value?: string | null,
  type: 'cpf' | 'cnpj' | 'auto' = 'auto'
): { isValid: boolean; error?: string; normalized: string } {
  const normalized = normalizeDocument(value);

  if (type === 'cpf') {
    const val = validateCPF(normalized);
    return { ...val, normalized };
  }

  if (type === 'cnpj') {
    const val = validateCNPJ(normalized);
    return { ...val, normalized };
  }

  if (normalized.length <= 11) {
    const val = validateCPF(normalized);
    return { ...val, normalized };
  }
  const val = validateCNPJ(normalized);
  return { ...val, normalized };
}
