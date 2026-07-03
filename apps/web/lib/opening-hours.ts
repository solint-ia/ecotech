// Canonical storage format for Partner.openingHours (still a plain string column):
//   - 24/7: "24/7"
//   - Custom days + hours: "Seg,Ter,Qua,Qui,Sex|08:00-18:00"
// Legacy formats ("Aberto 24/7" and "Das 08:00 às 18:00") are still parsed for
// partners created before this feature existed.

export interface WeekDay {
  code: string;
  label: string;
}

// Monday-first order, as is customary in Brazilian Portuguese.
export const WEEK_DAYS: WeekDay[] = [
  { code: 'Seg', label: 'Segunda' },
  { code: 'Ter', label: 'Terça' },
  { code: 'Qua', label: 'Quarta' },
  { code: 'Qui', label: 'Quinta' },
  { code: 'Sex', label: 'Sexta' },
  { code: 'Sab', label: 'Sábado' },
  { code: 'Dom', label: 'Domingo' },
];

const ALL_DAY_CODES = WEEK_DAYS.map((d) => d.code);
const LEGACY_247_TEXT = 'Este estabelecimento funciona 24h todos os dias';

export function buildOpeningHours(days: string[], start: string, end: string, is247: boolean): string {
  if (is247) return '24/7';
  return `${days.join(',')}|${start}-${end}`;
}

export function parseOpeningHours(raw: string | undefined | null): { is247: boolean; days: string[]; start: string; end: string } {
  const fallback = { is247: false, days: ALL_DAY_CODES, start: '08:00', end: '18:00' };
  if (!raw) return fallback;

  if (raw === '24/7' || raw === 'Aberto 24/7') {
    return { is247: true, days: ALL_DAY_CODES, start: '00:00', end: '23:59' };
  }

  // Canonical format: "Seg,Ter,Qua|08:00-18:00"
  const canonicalMatch = raw.match(/^([A-Za-zÀ-ú,]+)\|(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (canonicalMatch) {
    const days = canonicalMatch[1].split(',').filter((d) => ALL_DAY_CODES.includes(d));
    return {
      is247: false,
      days: days.length > 0 ? days : ALL_DAY_CODES,
      start: canonicalMatch[2],
      end: canonicalMatch[3],
    };
  }

  // Legacy format: "Das 08:00 às 18:00" (no day info — assume every day)
  const legacyMatch = raw.match(/Das (\d{2}:\d{2}) às (\d{2}:\d{2})/);
  if (legacyMatch) {
    return { is247: false, days: ALL_DAY_CODES, start: legacyMatch[1], end: legacyMatch[2] };
  }

  return fallback;
}

function formatDaysLabel(days: string[]): string {
  if (days.length === 7) return 'Todos os dias';

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const weekend = ['Sab', 'Dom'];
  const isExactly = (set: string[]) => days.length === set.length && set.every((d) => days.includes(d));

  if (isExactly(weekdays)) return 'Segunda a Sexta';
  if (isExactly(weekend)) return 'Sábado e Domingo';

  return days
    .map((code) => WEEK_DAYS.find((d) => d.code === code)?.label || code)
    .join(', ');
}

export function formatOpeningHoursDisplay(raw: string | undefined | null): string {
  if (!raw) return '';
  const parsed = parseOpeningHours(raw);
  if (parsed.is247) return LEGACY_247_TEXT;
  return `${formatDaysLabel(parsed.days)}, das ${parsed.start} às ${parsed.end}`;
}
