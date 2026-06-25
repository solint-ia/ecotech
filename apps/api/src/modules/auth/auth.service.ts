import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, filename?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let schoolId = registerDto.schoolId;

    // Se for Escola, criar a escola primeiro (transação simplificada)
    if (registerDto.role === 'SCHOOL_MANAGER') {
      if (!registerDto.schoolName || !registerDto.city || !registerDto.location) {
        throw new BadRequestException('Faltam dados obrigatórios para criar a escola.');
      }
      const school = await this.prisma.school.create({
        data: {
          name: registerDto.schoolName,
          city: registerDto.city,
          location: registerDto.location,
          territory: registerDto.cnpj || 'Não informado', // Usando cnpj para territory caso necessario ou apenas deixar
          cnpj: registerDto.cnpj,
          responsibleName: registerDto.managerName || registerDto.name,
          cpfManager: registerDto.cpfManager,
          email: registerDto.email,
          phone: registerDto.phone || '',
          description: 'Nova Escola Cadastrada',
        },
      });
      schoolId = school.id;
    }

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        password: hashedPassword,
        role: registerDto.role || 'STUDENT',
        schoolId: schoolId || null,
        profileImage: filename ? `/uploads/${filename}` : null,
      },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async validateUser(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.status) {
      throw new UnauthorizedException('Credenciais inválidas ou conta inativa.');
    }

    const isPasswordMatching = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    };
  }
}
