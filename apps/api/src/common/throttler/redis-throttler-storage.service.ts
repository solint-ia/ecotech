import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (redisUrl) {
      // Only use TLS for rediss:// URLs (e.g. Render external). Render internal
      // Redis uses redis:// without TLS, so forcing TLS there breaks the connection.
      const useTls = redisUrl.startsWith('rediss://');
      this.redis = new Redis(redisUrl, {
        keepAlive: 10000,
        ...(useTls ? { tls: {} } : {}),
      });
    } else {
      this.redis = new Redis({
        host: configService.get('REDIS_HOST') || 'localhost',
        port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
        keepAlive: 10000,
      });
    }

    // Register error handler to prevent Unhandled error event (ECONNRESET) logs
    this.redis.on('error', (error) => {
      console.warn('RedisThrottlerStorage: Redis connection error:', error.message);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `${storageKey}:blocked`;

    const isBlocked = await this.redis.exists(blockKey);
    if (isBlocked) {
      const timeToBlockExpire = await this.redis.pttl(blockKey);
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    const totalHits = await this.redis.incr(storageKey);
    if (totalHits === 1) {
      await this.redis.pexpire(storageKey, ttl);
    }
    const timeToExpire = await this.redis.pttl(storageKey);

    let blocked = false;
    let timeToBlockExpire = 0;
    if (totalHits > limit && blockDuration > 0) {
      blocked = true;
      timeToBlockExpire = blockDuration;
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: blocked,
      timeToBlockExpire,
    };
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
