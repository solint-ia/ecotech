import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(6, { message: 'A nova senha deve possuir no mínimo 6 caracteres.' })
  newPassword!: string;
}
