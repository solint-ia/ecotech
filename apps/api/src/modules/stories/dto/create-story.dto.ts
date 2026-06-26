import { IsOptional, IsString } from 'class-validator';

export class CreateStoryDto {
  @IsOptional()
  @IsString()
  schoolId?: string;
}
