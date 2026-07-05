import { Controller, Post, Body, Res, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(@Body() body: { email?: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    return this.authService.checkAvailability(body);
  }

  @Post('send-register-otp')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async sendRegisterOtp(@Body() body: { email: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    return this.authService.sendRegisterOtp(body);
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: memoryStorage(),
  }))
  async register(
    @Body() registerDto: any,
    @Res({ passthrough: true }) response: express.Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!registerDto.otp) {
      throw new BadRequestException('Código OTP é obrigatório.');
    }

    let publicUrl: string | undefined;
    if (file) {
      publicUrl = await this.supabaseService.uploadFile(file, 'avatars');
    }

    const user = await this.authService.register(registerDto, registerDto.otp, publicUrl);

    // Auto-login since OTP is already verified at this stage
    const result = await this.authService.login(user);

    response.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 anos (o usuário permanece logado indefinidamente)
    });

    return { success: true, user: result.user, accessToken: result.access_token };
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() body: { email: string; token: string },
    @Res({ passthrough: true }) response: express.Response,
  ) {
    // Left for backwards compatibility or manual verification
    const { user } = await this.authService.verifyEmail(body.email, body.token);

    const result = await this.authService.login(user);

    response.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    });

    return { success: true, user: result.user, accessToken: result.access_token };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-reset-otp')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body() body: { email: string; token: string }) {
    return this.authService.verifyResetOtp(body.email, body.token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { email: string; token: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.token, body.newPassword);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: express.Response) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user);

    // Configurando o Cookie HttpOnly de autenticação JWT
    response.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 anos (o usuário permanece logado indefinidamente)
    });

    return { user: result.user, accessToken: result.access_token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: express.Response) {
    response.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Desconectado com sucesso.' };
  }

  @Post('change-password')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post('request-email-update')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async requestEmailUpdate(@CurrentUser() user: any, @Body() body: { newEmail: string; currentPassword?: string }) {
    if (!body.newEmail || !body.currentPassword) {
      throw new BadRequestException('Novo e-mail e senha atual são obrigatórios.');
    }
    return this.authService.requestEmailUpdate(user.id, body.newEmail, body.currentPassword);
  }

  @Post('verify-email-update')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyEmailUpdate(@CurrentUser() user: any, @Body() body: { newEmail: string; otp: string }) {
    if (!body.newEmail || !body.otp) {
      throw new BadRequestException('Novo e-mail e código OTP são obrigatórios.');
    }
    return this.authService.verifyEmailUpdate(user.id, body.newEmail, body.otp);
  }
}
