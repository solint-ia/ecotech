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
import { DifficultyEnum } from './create-trail.dto';

export class UpdateTrailDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(120, { message: 'O título deve ter no máximo 120 caracteres.' })
  title?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  biome?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
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
