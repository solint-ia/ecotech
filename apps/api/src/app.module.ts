import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { TrailsModule } from './modules/trails/trails.module';
import { EducationalPointsModule } from './modules/educational-points/educational-points.module';

@Module({
  imports: [AuthModule, PrismaModule, SchoolsModule, TrailsModule, EducationalPointsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
