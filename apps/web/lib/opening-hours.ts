// Partner.openingHours storage format: an array with one entry per weekday (Monday-first),
// each holding zero or more shifts (supports split schedules like 08:00-12:00 + 14:00-18:00).

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface Shift {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface DaySchedule {
  day: DayKey;
  enabled: boolean;
  shifts: Shift[];
}

export type OpeningHours = DaySchedule[];

interface WeekDayInfo {
  key: DayKey;
  label: string;
  short: string;
}

export const WEEK_DAYS: WeekDayInfo[] = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

function dayLabel(key: DayKey): string {
  return WEEK_DAYS.find((d) => d.key === key)?.label || key;
}

export function createEmptySchedule(): OpeningHours {
  return WEEK_DAYS.map((d) => ({
    day: d.key,
    enabled: false,
    shifts: [{ open: '08:00', close: '18:00' }],
  }));
}

export function markAll24h(): OpeningHours {
  return WEEK_DAYS.map((d) => ({
    day: d.key,
    enabled: true,
    shifts: [{ open: '00:00', close: '23:59' }],
  }));
}

export function validateSchedule(schedule: OpeningHours): string | null {
  if (!schedule.some((d) => d.enabled)) {
    return 'Selecione ao menos um dia de funcionamento.';
  }

  for (const day of schedule) {
    if (!day.enabled) continue;

    if (day.shifts.length === 0) {
      return `Adicione ao menos um turno para ${dayLabel(day.day)} ou desative o dia.`;
    }

    for (const shift of day.shifts) {
      if (!shift.open || !shift.close) {
        return `Preencha os horários de ${dayLabel(day.day)}.`;
      }
      // Overnight/cross-midnight shifts (e.g. "10h às 9h", 22:00–06:00) are
      // allowed, so we do not require the close time to be after the open time.
    }
  }

  return null;
}

const SAO_PAULO_TZ = 'America/Sao_Paulo';

const INTL_WEEKDAY_TO_DAYKEY: Record<string, DayKey> = {
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
  Sun: 'sunday',
};

function getSaoPauloNow(now: Date): { day: DayKey; time: string } {
  // hourCycle 'h23' avoids the en-US default (h24) rendering midnight as "24:00" instead of "00:00".
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  return { day: INTL_WEEKDAY_TO_DAYKEY[weekday], time: `${hour}:${minute}` };
}

export function isOpenNow(schedule: OpeningHours, now: Date = new Date()): boolean {
  const { day: dayKey, time } = getSaoPauloNow(now);
  const day = schedule.find((d) => d.day === dayKey);
  if (!day || !day.enabled) return false;
  return day.shifts.some((shift) => time >= shift.open && time < shift.close);
}

export interface GroupedScheduleEntry {
  label: string;
  hoursText: string;
}

function shiftsSignature(day: DaySchedule): string {
  if (!day.enabled || day.shifts.length === 0) return 'closed';
  return day.shifts.map((s) => `${s.open}-${s.close}`).join(',');
}

function formatDaysLabel(days: DayKey[]): string {
  if (days.length === 1) return dayLabel(days[0]);
  if (days.length === 7) return 'Todos os dias';
  const firstLabel = dayLabel(days[0]);
  const lastLabel = dayLabel(days[days.length - 1]);
  return days.length > 2 ? `${firstLabel} a ${lastLabel}` : `${firstLabel} e ${lastLabel}`;
}

// Merges consecutive weekdays (Monday-first) that share the exact same shifts (or are both closed)
// into a single entry, e.g. "Segunda a Sexta: 08:00 às 18:00" / "Sábado e Domingo: Fechado".
export function groupScheduleForDisplay(schedule: OpeningHours): GroupedScheduleEntry[] {
  const ordered = WEEK_DAYS.map(
    (d) => schedule.find((s) => s.day === d.key) || { day: d.key, enabled: false, shifts: [] },
  );

  const groups: { days: DayKey[]; signature: string; shifts: Shift[] }[] = [];
  for (const day of ordered) {
    const signature = shiftsSignature(day);
    const last = groups[groups.length - 1];
    if (last && last.signature === signature) {
      last.days.push(day.day);
    } else {
      groups.push({ days: [day.day], signature, shifts: day.shifts });
    }
  }

  return groups.map((g) => ({
    label: formatDaysLabel(g.days),
    hoursText:
      g.signature === 'closed' ? 'Fechado' : g.shifts.map((s) => `${s.open} às ${s.close}`).join(', '),
  }));
}
