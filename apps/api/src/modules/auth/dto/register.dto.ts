import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, SchoolType } from '@prisma/client';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  schoolId?: string;

  // Campos para quando a role for SCHOOL_MANAGER (Escola)
  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsOptional()
  @IsEnum(SchoolType)
  schoolType?: SchoolType;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  managerName?: string;

  @IsOptional()
  @IsString()
  cpfManager?: string;
}
