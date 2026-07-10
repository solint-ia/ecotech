import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { AnalyticsCacheService } from '../../common/cache/analytics-cache.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private analyticsCache: AnalyticsCacheService,
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
          type: registerDto.schoolType || null,
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
    const requestedRole = (registerDto.role && allowedPublicRoles.includes(registerDto.role))
      ? registerDto.role
      : 'STUDENT';

    // A teacher can link to several schools (N:N). Normalize the incoming ids
    // (schoolIds may arrive as a single string or an array via multipart) and
    // use the first as the representative User.schoolId.
    let teacherSchoolIds: string[] = [];
    if (requestedRole === 'TEACHER') {
      const raw = registerDto.schoolIds ?? (registerDto.schoolId ? [registerDto.schoolId] : []);
      teacherSchoolIds = [...new Set((Array.isArray(raw) ? raw : [raw]).filter(Boolean))];
      if (teacherSchoolIds.length === 0) {
        throw new BadRequestException('Selecione pelo menos uma escola para vincular seu cadastro.');
      }
      const found = await this.prisma.school.count({ where: { id: { in: teacherSchoolIds } } });
      if (found !== teacherSchoolIds.length) {
        throw new BadRequestException('Uma ou mais escolas selecionadas não foram encontradas.');
      }
      schoolId = teacherSchoolIds[0];
    }

    if (requestedRole === 'STUDENT' && !schoolId) {
      throw new BadRequestException('Selecione uma escola para vincular seu cadastro.');
    }

    // Every school-linked signup (student, teacher and school manager) starts as
    // PENDENTE and must be approved before gaining posting access. Students are
    // approved by a teacher/manager/admin of the same school.
    const roleStatus = 'PENDENTE';

    // As per requirement: someone registering as a teacher stays as a user until approved
    const assignedRole = requestedRole === 'TEACHER' ? 'USER' : requestedRole;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          phone: registerDto.phone,
          birthDate: registerDto.birthDate ? new Date(registerDto.birthDate) : null,
          password: hashedPassword,
          role: assignedRole as any,
          roleStatus: roleStatus,
          schoolId: schoolId || null,
          profileImage: publicUrl || null,
          emailVerified: new Date(), // verified right away
        },
      });

      if (requestedRole === 'TEACHER') {
        await tx.teacherSchool.createMany({
          data: teacherSchoolIds.map((id) => ({ teacherId: created.id, schoolId: id, status: 'PENDENTE' as any })),
        });
      }

      return created;
    });

    await this.prisma.verificationToken.deleteMany({
      where: { email: user.email, type: 'EMAIL_VERIFICATION' }
    });

    // A signup adds head counts, a birth date (moving the averages) and, for a
    // manager, a whole new school.
    await this.analyticsCache.invalidate({ schoolId: user.schoolId });
    for (const id of teacherSchoolIds) {
      if (id !== user.schoolId) {
        await this.analyticsCache.invalidate({ schoolId: id });
      }
    }

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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Senha atual incorreta.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Senha alterada com sucesso.' };
  }

  async requestEmailUpdate(userId: string, newEmail: string, currentPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    // 1. Password check
    if (!currentPassword) {
      throw new BadRequestException('Senha atual é obrigatória.');
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Senha atual incorreta.');

    // 2. Check if newEmail is already used
    const existingUser = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) throw new BadRequestException('Este e-mail já está em uso.');

    // 3. Generate OTP and save token for the NEW email
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await this.prisma.verificationToken.deleteMany({
      where: { email: newEmail, type: 'EMAIL_UPDATE' }
    });
    
    await this.prisma.verificationToken.create({
      data: {
        email: newEmail,
        token: otp,
        type: 'EMAIL_UPDATE',
        expiresAt
      }
    });

    // 4. Send email asynchronously using the BullMQ queue
    await this.mailQueue.add('send-otp', {
      email: newEmail,
      name: 'EMAIL_UPDATE',
      code: otp
    });

    return { success: true, message: 'Código enviado para o novo e-mail.' };
  }

  async verifyEmailUpdate(userId: string, newEmail: string, otp: string) {
    const record = await this.prisma.verificationToken.findFirst({
      where: { email: newEmail, token: otp, type: 'EMAIL_UPDATE' }
    });

    if (!record) throw new BadRequestException('Código inválido ou incorreto.');
    if (record.expiresAt < new Date()) throw new BadRequestException('O código expirou. Solicite um novo.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    // Update email
    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail }
    });

    // Clean up tokens
    await this.prisma.verificationToken.deleteMany({
      where: { email: newEmail, type: 'EMAIL_UPDATE' }
    });

    return { success: true, message: 'E-mail atualizado com sucesso.' };
  }
}
