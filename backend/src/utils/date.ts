/**
 * PetHub Backend Date & Time Utilities
 * Official timezone: America/Sao_Paulo (UTC-3)
 * Provides consistent date, time, and scheduling calculations.
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export interface BrasiliaDateTime {
  dateStr: string;       // YYYY-MM-DD
  timeStr: string;       // HH:mm
  totalMinutes: number;  // 0 - 1439
  hour: number;          // 0 - 23
  minute: number;        // 0 - 59
}

/**
 * Returns current timestamp information in America/Sao_Paulo.
 */
export function getBrasiliaNow(): BrasiliaDateTime {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: BRAZIL_TIMEZONE }).format(now);
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const totalMinutes = hour * 60 + minute;

  return { dateStr, timeStr, totalMinutes, hour, minute };
}

/**
 * Returns today's date in America/Sao_Paulo as YYYY-MM-DD.
 */
export function getBrasiliaToday(): string {
  return getBrasiliaNow().dateStr;
}

/**
 * Checks whether a given YYYY-MM-DD string is today in America/Sao_Paulo.
 */
export function isTodayInBrasilia(dateStr: string): boolean {
  if (!dateStr) return false;
  const clean = dateStr.split('T')[0];
  return clean === getBrasiliaToday();
}

/**
 * Checks whether a given YYYY-MM-DD string is strictly before today in America/Sao_Paulo.
 */
export function isDatePastInBrasilia(dateStr: string): boolean {
  if (!dateStr) return false;
  const clean = dateStr.split('T')[0];
  return clean < getBrasiliaToday();
}

/**
 * Converts "HH:mm" to total minutes since midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts total minutes since midnight to "HH:mm".
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Checks if a specific slot time ("HH:mm") on a given date ("YYYY-MM-DD") is in the past.
 * If bufferMinutes is specified (e.g. min advance notice), the slot is also considered past
 * if it occurs before (now + bufferMinutes).
 */
export function isSlotPastInBrasilia(dateStr: string, timeStr: string, bufferMinutes = 0): boolean {
  const cleanDate = dateStr.split('T')[0];
  const now = getBrasiliaNow();

  if (cleanDate < now.dateStr) {
    return true;
  }
  if (cleanDate > now.dateStr) {
    return false;
  }

  // Same day: compare slot minutes with current minutes + buffer
  const slotMinutes = parseTimeToMinutes(timeStr);
  return slotMinutes <= (now.totalMinutes + bufferMinutes);
}

/**
 * Returns day-of-week keys for working hours matching (English and Portuguese).
 */
export function getDayKeysForDate(dateStr: string): { dayKey: string; ptDayKey: string; dayOfWeek: number } {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  // UTC noon avoids any DST or timezone boundary issues
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = d.getUTCDay();

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const ptDayKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  return {
    dayKey: dayKeys[dayOfWeek],
    ptDayKey: ptDayKeys[dayOfWeek],
    dayOfWeek,
  };
}
