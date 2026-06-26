import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateLibraryContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
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
