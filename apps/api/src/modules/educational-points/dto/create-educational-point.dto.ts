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
import { Type, Transform } from 'class-transformer';

export enum PointTypeEnum {
  FLORA = 'FLORA',
  RIO = 'RIO',
  FAUNA = 'FAUNA',
  ESPACO_CULTURAL = 'ESPACO_CULTURAL',
  AREA_VERDE = 'AREA_VERDE',
  OUTRO = 'OUTRO',
}

export enum PdfModeEnum {
  UPLOAD = 'UPLOAD',
  AUTO = 'AUTO',
}

export class CreateEducationalPointDto {
  @IsString()
  trailId: string;

  @IsString()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres.' })
  title: string;

  @IsEnum(PointTypeEnum, { message: 'Tipo de ponto inválido.' })
  type: PointTypeEnum;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  order: number;

  @IsString()
  @IsOptional()
  @MaxLength(250, { message: 'A descrição curta deve ter no máximo 250 caracteres.' })
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

  /**
   * Offline summary used for QR Code text content.
   * Max 250 chars per spec constraint SC to avoid high-density unreadable QR codes.
   */
  @IsString()
  @IsOptional()
  @MaxLength(250, {
    message: 'O resumo offline deve ter no máximo 250 caracteres para garantir a leitura do QR Code.',
  })
  offlineSummary?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  status?: boolean;

  @IsEnum(PdfModeEnum, { message: 'Modo de PDF inválido.' })
  pdfMode: PdfModeEnum;
}
