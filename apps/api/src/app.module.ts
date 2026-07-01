import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { TrailsModule } from './modules/trails/trails.module';
import { EducationalPointsModule } from './modules/educational-points/educational-points.module';
import { BiodiversityModule } from './modules/biodiversity/biodiversity.module';
import { PartnersModule } from './modules/partners/partners.module';
import { FeedModule } from './modules/feed/feed.module';
import { StoriesModule } from './modules/stories/stories.module';
import { LibraryModule } from './modules/library/library.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import * as redisStore from 'cache-manager-redis-store';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from './modules/supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST') || 'localhost',
        port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PrismaModule,
    SchoolsModule,
    TrailsModule,
    EducationalPointsModule,
    BiodiversityModule,
    PartnersModule,
    FeedModule,
    StoriesModule,
    LibraryModule,
    AnalyticsModule,
    UsersModule,
    MailModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    SupabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

