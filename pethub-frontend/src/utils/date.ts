/**
 * PetHub Date & Time Utilities
 * Padronização de datas, navegação temporal e timezone oficial (America/Sao_Paulo).
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso de Brasília.
 */
export function getBrasiliaToday(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: BRAZIL_TIMEZONE }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Adiciona ou subtrai dias a partir de uma data YYYY-MM-DD com segurança.
 */
export function addDaysToDate(dateStr: string, amount: number): string {
  try {
    const cleanStr = dateStr.split('T')[0];
    const [year, month, day] = cleanStr.split('-').map(Number);
    // Cria data às 12h UTC para evitar problemas com viradas de fuso/DST
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    d.setUTCDate(d.getUTCDate() + amount);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formata uma data YYYY-MM-DD para exibição resumida (ex: "08/09/2026").
 */
export function formatBrasiliaDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Data a definir';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
  } catch {
    return String(dateStr || 'Data a definir');
  }
}

/**
 * Formata uma data para exibição por extenso amigável (ex: "Segunda-feira, 07 de setembro de 2026").
 */
export function formatBrasiliaDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const [year, month, day] = cleanStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return d.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'UTC' 
    });
  } catch {
    return formatBrasiliaDate(dateStr);
  }
}

/**
 * Retorna o nome do dia da semana (ex: "Segunda-feira", "Terça-feira").
 */
export function formatBrasiliaWeekday(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const [year, month, day] = cleanStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
  } catch {
    return '';
  }
}

/**
 * Retorna a chave do dia da semana em português (ex: "segunda", "terca", "quarta").
 */
export function getDayKeyFromDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'segunda';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const [year, month, day] = cleanStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayIndex = d.getUTCDay(); // 0 = domingo, 1 = segunda, etc.
    const keys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return keys[dayIndex] || 'segunda';
  } catch {
    return 'segunda';
  }
}

export interface WeekDayInfo {
  iso: string;          // YYYY-MM-DD
  dayNumber: string;    // "07", "08"
  dayNameShort: string; // "Seg", "Ter", "Qua"...
  dayName: string;      // "Segunda", "Terça"...
  dayKey: string;       // "segunda", "terca"...
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Retorna os 7 dias da semana (Segunda a Domingo) em torno da data fornecida.
 */
export function getWeekDays(referenceDateStr: string, selectedDateStr: string): WeekDayInfo[] {
  const cleanRef = referenceDateStr.split('T')[0];
  const [year, month, day] = cleanRef.split('-').map(Number);
  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  // No JS: 0=domingo, 1=segunda, ..., 6=sábado
  // Para começar na Segunda:
  const dayOfWeek = refDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(refDate);
  monday.setUTCDate(refDate.getUTCDate() + diffToMonday);

  const todayIso = getBrasiliaToday();
  const weekDays: WeekDayInfo[] = [];

  const shortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const keys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setUTCDate(monday.getUTCDate() + i);

    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dNum = String(current.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dNum}`;

    const currentDow = current.getUTCDay();

    weekDays.push({
      iso,
      dayNumber: dNum,
      dayNameShort: shortNames[currentDow],
      dayName: fullNames[currentDow],
      dayKey: keys[currentDow],
      isToday: iso === todayIso,
      isSelected: iso === selectedDateStr,
    });
  }

  return weekDays;
}

/**
 * Formata um horário de agendamento de forma consistente.
 */
export function formatAppointmentTime(apt: any): string {
  if (!apt) return '09:00';
  if (typeof apt.time === 'string' && apt.time.trim()) {
    return apt.time.trim();
  }
  if (apt.date) {
    try {
      const d = new Date(apt.date);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch {}
  }
  return '09:00';
}

/**
 * Formata o timestamp de mensagens no padrão do PetHub (America/Sao_Paulo).
 * Ex: "14:30", "Ontem, 09:15", "05/09 às 18:20"
 */
export function formatMessageTimestamp(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    const msgDateStr = `${year}-${month}-${day}`;
    const todayStr = getBrasiliaToday();
    const yesterdayStr = addDaysToDate(todayStr, -1);

    if (msgDateStr === todayStr) {
      return `${hour}:${minute}`;
    }
    if (msgDateStr === yesterdayStr) {
      return `Ontem, ${hour}:${minute}`;
    }
    return `${day}/${month} às ${hour}:${minute}`;
  } catch {
    return '';
  }
}
