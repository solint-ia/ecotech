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

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  website?: string;

  @IsArray()
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
