import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DifficultyEnum {
  FACIL = 'FACIL',
  MODERADA = 'MODERADA',
  DIFICIL = 'DIFICIL',
}

export class CreateTrailDto {
  @IsString()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(120, { message: 'O título deve ter no máximo 120 caracteres.' })
  title: string;

  @IsString()
  @MinLength(2, { message: 'A cidade é obrigatória.' })
  city: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'A descrição curta deve ter no máximo 200 caracteres.' })
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  schoolId: string;

  @IsString()
  @IsOptional()
  biome?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'A extensão deve ser um número.' })
  @Min(0)
  distanceKm?: number;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsEnum(DifficultyEnum, { message: 'Dificuldade inválida.' })
  @IsOptional()
  difficulty?: DifficultyEnum;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsOptional()
  @IsUrl({}, { message: 'O link do Wikiloc deve ser uma URL válida.' })
  wikilocUrl?: string;

  @IsString()
  @IsOptional()
  safetyWarnings?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  status?: boolean;
}
