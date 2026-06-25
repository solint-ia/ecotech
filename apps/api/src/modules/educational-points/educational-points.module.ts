import { Module } from '@nestjs/common';
import { EducationalPointsController } from './educational-points.controller';
import { EducationalPointsService } from './educational-points.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EducationalPointsController],
  providers: [EducationalPointsService],
  exports: [EducationalPointsService],
})
export class EducationalPointsModule {}
