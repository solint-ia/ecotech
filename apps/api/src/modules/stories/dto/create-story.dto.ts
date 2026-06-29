import { IsOptional, IsString } from 'class-validator';

export class CreateStoryDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
