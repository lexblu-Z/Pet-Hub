/**
 * Formata número de telefone brasileiro no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validação rigorosa de telefone/WhatsApp brasileiro
 */
export function validatePhone(value: string): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'Informe seu telefone/WhatsApp.' };
  }

  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return { isValid: false, error: 'Informe seu telefone/WhatsApp.' };
  }

  if (digits.length < 10 || digits.length > 11) {
    return { isValid: false, error: 'Digite um número de telefone válido.' };
  }

  // Verifica dígitos repetidos como 11111111111 ou 00000000000
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, error: 'Digite um número de telefone válido.' };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  const invalidDdds = [20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78, 80, 90];
  if (ddd < 11 || ddd > 99 || invalidDdds.includes(ddd)) {
    return { isValid: false, error: 'Digite um número de telefone válido.' };
  }

  if (digits.length === 11 && digits[2] !== '9') {
    return { isValid: false, error: 'Digite um número de telefone válido.' };
  }

  return { isValid: true };
}
