import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ContentType } from '@prisma/client';

export class CreateLibraryContentDto {
  // Trim first so a title/description of only whitespace is rejected by
  // @IsNotEmpty (which otherwise accepts a string of spaces).
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
