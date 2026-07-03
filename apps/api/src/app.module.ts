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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            store: redisStore,
            url: redisUrl,
          };
        }
        return {
          store: redisStore,
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
            },
          };
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          // "short"/"medium" guard against real bursts/flooding without
          // punishing normal page loads, which routinely fire several
          // concurrent requests (session check, resource fetch, images...).
          { name: 'short', ttl: 1000, limit: 20 },
          { name: 'medium', ttl: 10000, limit: 100 },
          { name: 'default', ttl: 60000, limit: 300 },
        ],
        storage: new RedisThrottlerStorageService(configService),
      }),
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
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

