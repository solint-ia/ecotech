import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  trailId?: string;
}
