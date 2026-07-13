import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUrl,
  IsArray,
  IsIn,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { DAY_KEYS } from '../opening-hours.util';

export class ShiftDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Horário de abertura inválido (use HH:mm).',
  })
  open: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Horário de fechamento inválido (use HH:mm).',
  })
  close: string;
}

export class DayScheduleDto {
  @IsIn(DAY_KEYS, { message: 'Dia da semana inválido.' })
  day: (typeof DAY_KEYS)[number];

  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts: ShiftDto[];
}

/** Espaços em branco não valem como preenchimento. */
const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreatePartnerDto {
  @trim()
  @IsString({ message: 'O nome do parceiro é obrigatório.' })
  @IsNotEmpty({ message: 'O nome do parceiro é obrigatório.' })
  name: string;

  @trim()
  @IsString({ message: 'A categoria é obrigatória.' })
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  category: string;

  @trim()
  @IsString({ message: 'A descrição é obrigatória.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @trim()
  @IsString({ message: 'O endereço é obrigatório.' })
  @IsNotEmpty({ message: 'O endereço é obrigatório.' })
  address: string;

  @IsString()
  @IsOptional()
  state?: string;

  @trim()
  @IsString({ message: 'A cidade é obrigatória.' })
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  city: string;

  @trim()
  @IsString({ message: 'O telefone é obrigatório.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  phone: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Informe um site válido (ex.: https://exemplo.com).' })
  website?: string;

  @IsArray({ message: 'Informe o horário de funcionamento.' })
  @ValidateNested({ each: true })
  @Transform(({ value }): DayScheduleDto[] => {
    const parsed = (
      typeof value === 'string' ? JSON.parse(value) : value
    ) as Record<string, unknown>[];
    return plainToInstance(DayScheduleDto, parsed);
  })
  openingHours: DayScheduleDto[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  status?: boolean;
}
