import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBiodiversityDto {
  @IsUUID()
  @IsNotEmpty()
  trailId: string;

  @IsString()
  @IsNotEmpty()
  groupType: string;

  @IsString()
  @IsNotEmpty()
  popularName: string;

  @IsString()
  @IsOptional()
  scientificName?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  curiosities?: string;

  @IsString()
  @IsNotEmpty()
  environmentalImportance: string;

  @IsString()
  @IsOptional()
  image?: string;
}
