import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { AnalyticsCacheService } from './analytics-cache.service';

/**
 * Global so any service can invalidate analytics after a write without importing
 * (and risking a cycle with) the analytics module. Relies on CACHE_MANAGER and
 * PrismaService, both already registered globally in AppModule.
 */
@Global()
@Module({
  providers: [CacheService, AnalyticsCacheService],
  exports: [CacheService, AnalyticsCacheService],
})
export class AppCacheModule {}
