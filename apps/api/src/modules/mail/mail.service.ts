import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://smtp.maileroo.com/api/v2/emails';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MAILEROO_API_KEY') || '';
  }

  async sendOtpEmail(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'EMAIL_UPDATE', otpCode: string): Promise<boolean> {
    const isVerification = type === 'EMAIL_VERIFICATION';
    const isEmailUpdate = type === 'EMAIL_UPDATE';
    
    let subject = 'Recuperação de Senha - EcoTech';
    if (isVerification) subject = 'Confirme seu e-mail na EcoTech';
    if (isEmailUpdate) subject = 'Confirme a alteração de e-mail na EcoTech';

    let htmlContent = '';

    if (isVerification) {
      htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0B3B24; text-align: center;">Bem-vindo(a) à EcoTech!</h2>
        <p style="color: #333; font-size: 16px;">Olá! Falta pouco para você explorar as trilhas. Use o código de 6 dígitos abaixo para ativar sua conta na EcoTech:</p>
        <div style="background-color: #0B3B24; color: #fff; text-align: center; font-size: 28px; font-weight: bold; padding: 15px; margin: 20px 0; border-radius: 6px; letter-spacing: 5px;">
          ${otpCode}
        </div>
        <p style="color: #666; font-size: 12px; text-align: center;">Este código expira em 10 minutos. Se você não solicitou este e-mail, pode ignorá-lo.</p>
      </div>
      `;
    } else if (isEmailUpdate) {
      htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0B3B24; text-align: center;">Confirmação de novo E-mail</h2>
        <p style="color: #333; font-size: 16px;">Olá! Recebemos uma solicitação para alterar o e-mail da sua conta EcoTech para este endereço. Use o código abaixo para confirmar a alteração:</p>
        <div style="background-color: #0B3B24; color: #fff; text-align: center; font-size: 28px; font-weight: bold; padding: 15px; margin: 20px 0; border-radius: 6px; letter-spacing: 5px;">
          ${otpCode}
        </div>
        <p style="color: #666; font-size: 12px; text-align: center;">Este código expira em 10 minutos. Se você não solicitou esta alteração, não se preocupe, nenhuma mudança será feita.</p>
      </div>
      `;
    } else {
      htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0B3B24; text-align: center;">Recuperação de Senha</h2>
        <p style="color: #333; font-size: 16px;">Recebemos um pedido para redefinir sua senha. Insira o código a seguir no aplicativo:</p>
        <div style="background-color: #0B3B24; color: #fff; text-align: center; font-size: 28px; font-weight: bold; padding: 15px; margin: 20px 0; border-radius: 6px; letter-spacing: 5px;">
          ${otpCode}
        </div>
        <p style="color: #666; font-size: 12px; text-align: center;">Este código expira em 10 minutos. Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
      </div>
      `;
    }

    const payload = {
      from: {
        address: 'nao-responda@projetoecotech.online',
        display_name: 'EcoTech'
      },
      to: [
        {
          address: email
        }
      ],
      subject: subject,
      html: htmlContent
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Maileroo error: ${response.status} ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to send email via Maileroo', error);
      return false;
    }
  }
}
