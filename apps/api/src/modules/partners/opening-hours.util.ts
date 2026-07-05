import { BadRequestException } from '@nestjs/common';

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface Shift {
  open: string;
  close: string;
}

export interface DaySchedule {
  day: DayKey;
  enabled: boolean;
  shifts: Shift[];
}

export function validateOpeningHours(schedule: DaySchedule[]): void {
  for (const day of schedule) {
    if (!day.enabled) continue;

    if (day.shifts.length === 0) {
      throw new BadRequestException(
        `Selecione ao menos um turno para o dia habilitado (${day.day}).`,
      );
    }

    for (const shift of day.shifts) {
      if (shift.close <= shift.open) {
        throw new BadRequestException(
          `Horário de fechamento deve ser depois do horário de abertura (${day.day}: ${shift.open}-${shift.close}).`,
        );
      }
    }
  }
}
