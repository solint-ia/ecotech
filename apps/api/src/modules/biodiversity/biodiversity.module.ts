import { Module } from '@nestjs/common';
import { BiodiversityService } from './biodiversity.service';
import { BiodiversityController } from './biodiversity.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BiodiversityController],
  providers: [BiodiversityService],
})
export class BiodiversityModule {}
