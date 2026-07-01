import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EducationalPointsController } from './educational-points.controller';
import { EducationalPointsService } from './educational-points.service';
import { PdfProcessor } from './pdf.processor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'pdf-queue',
    }),
  ],
  controllers: [EducationalPointsController],
  providers: [EducationalPointsService, PdfProcessor],
  exports: [EducationalPointsService],
})
export class EducationalPointsModule {}
