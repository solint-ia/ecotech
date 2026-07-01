import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { Logger } from '@nestjs/common';

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    
    if (job.name === 'send-otp') {
      const { email, code, name } = job.data;
      try {
        await this.mailService.sendOtpEmail(email, name, code);
        this.logger.log(`OTP Email sent successfully to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send OTP to ${email}: ${error.message}`);
        throw error; // This will tell BullMQ to retry or fail the job
      }
    }
  }
}
