import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PointTypeEnum } from './create-educational-point.dto';

export class UpdateEducationalPointDto {
  @IsString()
  @IsOptional()
  trailId?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @IsEnum(PointTypeEnum, { message: 'Tipo de ponto inválido.' })
  @IsOptional()
  type?: PointTypeEnum;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  order?: number;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsOptional()
  curiosities?: string;

  @IsString()
  @IsOptional()
  environmentalImportance?: string;

  @IsString()
  @IsOptional()
  preservationCare?: string;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(250, {
    message: 'O resumo offline deve ter no máximo 250 caracteres.',
  })
  offlineSummary?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  status?: boolean;
}
