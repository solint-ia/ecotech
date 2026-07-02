import { Module } from '@nestjs/common';
import { BiodiversityService } from './biodiversity.service';
import { BiodiversityController } from './biodiversity.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [BiodiversityController],
  providers: [BiodiversityService],
})
export class BiodiversityModule {}
