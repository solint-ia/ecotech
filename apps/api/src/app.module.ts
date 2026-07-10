import { Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
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

import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { createKeyv } from '@keyv/redis';
import type { Cache } from 'cache-manager';
import { AppCacheModule } from './common/cache/app-cache.module';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';

/** Isolates cache keys from BullMQ / throttler keys on the shared Redis. */
const CACHE_NAMESPACE = 'ecotech:cache';
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

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
        const logger = new Logger('CacheModule');
        // node-redis derives TLS from the rediss:// scheme, so no manual socket
        // config is needed here.
        const redisUrl =
          configService.get<string>('REDIS_URL') ||
          `redis://${configService.get('REDIS_HOST') || 'localhost'}:${configService.get('REDIS_PORT') || '6379'}`;

        // The namespace keeps cache keys away from the BullMQ job keys and the
        // throttler counters, which share this same Redis instance.
        const keyv = createKeyv(redisUrl, { namespace: CACHE_NAMESPACE });

        // Keyv is an EventEmitter: an unhandled 'error' would take the whole
        // process down whenever Redis blips. Log and move on — CacheService
        // already fails open on every read/write.
        keyv.on('error', (err: unknown) =>
          logger.warn(`Redis de cache indisponível: ${(err as Error)?.message ?? err}`),
        );

        return { stores: [keyv], ttl: DEFAULT_CACHE_TTL_MS };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const useTls = redisUrl.startsWith('rediss://');
          return {
            connection: {
              url: redisUrl,
              ...(useTls ? { tls: {} } : {}),
              keepAlive: 10000,
            },
          };
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
            keepAlive: 10000,
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
    AppCacheModule,
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
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Asserts the cache really landed on Redis. A mismatched adapter makes
   * cache-manager silently fall back to an in-process Map, which looks fine in
   * dev and quietly breaks cross-instance invalidation in production. That is
   * exactly how this codebase shipped an inert "Redis" cache before — so we now
   * say so out loud at boot instead of guessing.
   */
  onModuleInit() {
    const storeName = (this.cacheManager as any)?.stores?.[0]?.opts?.store?.constructor?.name;

    if (storeName === 'KeyvRedis') {
      this.logger.log('Cache conectado ao Redis (KeyvRedis).');
    } else {
      this.logger.error(
        `Cache NÃO está no Redis (store="${storeName ?? 'desconhecido'}"). ` +
          'A invalidação entre instâncias não vai funcionar. Verifique REDIS_URL.',
      );
    }
  }
}

