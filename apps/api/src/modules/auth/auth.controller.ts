import { Controller, Post, Body, Res, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(@Body() body: { email?: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    return this.authService.checkAvailability(body);
  }

  @Post('send-register-otp')
  @HttpCode(HttpStatus.OK)
  async sendRegisterOtp(@Body() body: { email: string; phone?: string; cpfManager?: string; cnpj?: string }) {
    return this.authService.sendRegisterOtp(body);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async register(
    @Body() registerDto: any,
    @Res({ passthrough: true }) response: express.Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!registerDto.otp) {
      throw new BadRequestException('Código OTP é obrigatório.');
    }
    const user = await this.authService.register(registerDto, registerDto.otp, file?.filename);
    
    // Auto-login since OTP is already verified at this stage
    const result = await this.authService.login(user);

    response.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    });

    return { success: true, user: result.user, accessToken: result.access_token };
  }

  @Post('verify-email')
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
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { success: true, user: result.user, accessToken: result.access_token };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-reset-otp')
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
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: express.Response) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user);

    // Configurando o Cookie HttpOnly de autenticação JWT
    response.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
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
}
