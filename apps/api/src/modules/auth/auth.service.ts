import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectQueue('mail-queue') private mailQueue: Queue,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async checkAvailability(data: { email?: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    const { email, phone, cpfManager, cnpj } = data;
    const errors: Record<string, string> = {};

    if (email || phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : [])
          ]
        }
      });
      if (existingUser) {
        if (email && existingUser.email === email) errors.email = 'E-mail já está em uso.';
        if (phone && existingUser.phone === phone) errors.phone = 'Telefone já está em uso.';
      }
    }

    if (cpfManager || cnpj) {
      const existingSchool = await this.prisma.school.findFirst({
        where: {
          OR: [
            ...(cpfManager ? [{ cpfManager }] : []),
            ...(cnpj ? [{ cnpj }] : [])
          ]
        }
      });
      if (existingSchool) {
        if (cpfManager && existingSchool.cpfManager === cpfManager) errors.cpfManager = 'CPF já está em uso por outra escola.';
        if (cnpj && existingSchool.cnpj === cnpj) errors.cnpj = 'CNPJ já está em uso por outra escola.';
      }
    }
    
    return { available: Object.keys(errors).length === 0, errors };
  }

  async sendRegisterOtp(data: { email: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    const { email, phone, cpfManager, cnpj } = data;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) throw new BadRequestException('E-mail já está em uso.');
      if (existingUser.phone === phone) throw new BadRequestException('Telefone já está em uso.');
    }

    if (cpfManager || cnpj) {
      const existingSchool = await this.prisma.school.findFirst({
        where: {
          OR: [
            ...(cpfManager ? [{ cpfManager }] : []),
            ...(cnpj ? [{ cnpj }] : [])
          ]
        }
      });
      if (existingSchool) {
        if (existingSchool.cpfManager === cpfManager) throw new BadRequestException('CPF já está em uso por outra escola.');
        if (existingSchool.cnpj === cnpj) throw new BadRequestException('CNPJ já está em uso por outra escola.');
      }
    }

    const otpCode = this.generateOtp();

    await this.prisma.verificationToken.deleteMany({
      where: { email, type: 'EMAIL_VERIFICATION' }
    });

    await this.prisma.verificationToken.create({
      data: {
        email,
        token: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60000), // 10 minutes
        type: 'EMAIL_VERIFICATION'
      }
    });

    // Adiciona na fila ao invés de enviar de forma síncrona
    await this.mailQueue.add('send-otp', { email, name: 'EMAIL_VERIFICATION', code: otpCode });

    return { success: true };
  }

  async register(registerDto: RegisterDto, otpCode: string, publicUrl?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso.');
    }

    // Validate OTP
    const record = await this.prisma.verificationToken.findFirst({
      where: { email: registerDto.email, token: otpCode, type: 'EMAIL_VERIFICATION' }
    });

    if (!record) {
      throw new BadRequestException('Código inválido.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Código expirado.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let schoolId = registerDto.schoolId;

    // Se for Escola, criar a escola primeiro (transação simplificada)
    if (registerDto.role === 'SCHOOL_MANAGER') {
      if (!registerDto.schoolName || !registerDto.city || !registerDto.state || !registerDto.location) {
        throw new BadRequestException('Faltam dados obrigatórios para criar a escola (nome, estado, cidade, endereço).');
      }
      const school = await this.prisma.school.create({
        data: {
          name: registerDto.schoolName,
          state: registerDto.state,
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

    // SECURITY FIX: Prevent Privilege Escalation
    // Block users from registering as ADMIN via public endpoints
    const allowedPublicRoles = ['STUDENT', 'SCHOOL_MANAGER', 'TEACHER'];
    const assignedRole = (registerDto.role && allowedPublicRoles.includes(registerDto.role))
      ? registerDto.role
      : 'STUDENT';

    const roleStatus = (assignedRole === 'SCHOOL_MANAGER' || assignedRole === 'TEACHER') ? 'PENDENTE' : 'APROVADO';

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        password: hashedPassword,
        role: assignedRole,
        roleStatus: roleStatus,
        schoolId: schoolId || null,
        profileImage: publicUrl || null,
        emailVerified: new Date(), // verified right away
      },
    });

    await this.prisma.verificationToken.deleteMany({
      where: { email: user.email, type: 'EMAIL_VERIFICATION' }
    });

    const { password: _, ...result } = user;
    return result;
  }

  async validateUser(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { school: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.status) {
      throw new UnauthorizedException('Conta suspensa. Por favor, contate o suporte.');
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
        name: user.role === 'SCHOOL_MANAGER' && user.school ? user.school.name : user.name,
        email: user.email,
        role: user.role,
        roleStatus: user.roleStatus,
        schoolId: user.schoolId,
        profileImage: user.role === 'SCHOOL_MANAGER' && user.school ? user.school.coverImage : user.profileImage,
      },
    };
  }

  async verifyEmail(email: string, token: string) {
    const record = await this.prisma.verificationToken.findFirst({
      where: { email, token, type: 'EMAIL_VERIFICATION' }
    });

    if (!record) {
      throw new BadRequestException('Código inválido.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Código expirado.');
    }

    const user = await this.prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    });

    await this.prisma.verificationToken.deleteMany({
      where: { email, type: 'EMAIL_VERIFICATION' }
    });

    return { success: true, user };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('E-mail não está cadastrado na plataforma.');
    }

    const otpCode = this.generateOtp();
    
    await this.prisma.verificationToken.deleteMany({
      where: { email, type: 'PASSWORD_RESET' }
    });

    await this.prisma.verificationToken.create({
      data: {
        email,
        token: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60000),
        type: 'PASSWORD_RESET'
      }
    });

    await this.mailQueue.add('send-otp', { email, name: 'PASSWORD_RESET', code: otpCode });
    
    return { success: true };
  }

  async verifyResetOtp(email: string, token: string) {
    const record = await this.prisma.verificationToken.findFirst({
      where: { email, token, type: 'PASSWORD_RESET' }
    });

    if (!record) {
      throw new BadRequestException('Código inválido.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Código expirado.');
    }

    return { success: true };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const record = await this.prisma.verificationToken.findFirst({
      where: { email, token, type: 'PASSWORD_RESET' }
    });

    if (!record) {
      throw new BadRequestException('Código inválido.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Código expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    await this.prisma.verificationToken.deleteMany({
      where: { email, type: 'PASSWORD_RESET' }
    });

    return { success: true };
  }
}
