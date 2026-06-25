import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateBiodiversityDto {
  @IsUUID()
  @IsOptional()
  trailId?: string;

  @IsString()
  @IsOptional()
  groupType?: string;

  @IsString()
  @IsOptional()
  popularName?: string;

  @IsString()
  @IsOptional()
  scientificName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  curiosities?: string;

  @IsString()
  @IsOptional()
  environmentalImportance?: string;

  @IsString()
  @IsOptional()
  image?: string;
}
