import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * A cache read slower than this is worth less than just querying Postgres, so we
 * stop waiting and treat it as a miss.
 */
const GET_TIMEOUT_MS = 250;
const WRITE_TIMEOUT_MS = 1000;

/** After this many consecutive failures the cache is bypassed entirely for a
 *  while, so a Redis outage costs one timeout per window instead of one per
 *  request. */
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 30_000;

/** Keeps an outage from flooding the logs with one line per request. */
const WARN_INTERVAL_MS = 10_000;

const TIMED_OUT = Symbol('cache-timeout');

/**
 * Thin wrapper over the cache-manager store that **always fails open**: if Redis
 * is unreachable, slow or misbehaving, reads report a miss and writes are
 * dropped, so the request falls through to the database instead of hanging or
 * returning a 5xx.
 *
 * The timeouts are not paranoia. node-redis queues commands while it is
 * reconnecting, so a plain `await cache.get(...)` against a downed Redis never
 * settles — it hangs the request forever. Bounding every operation is what makes
 * "fail open" actually true.
 *
 * Deliberately exposes no `clear()`. The cache shares its Redis instance with
 * BullMQ and the throttler, and wiping by key is both safer and cheaper than
 * wiping a whole namespace.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private lastWarnAt = 0;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private get circuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private warnThrottled(message: string): void {
    const now = Date.now();
    if (now - this.lastWarnAt < WARN_INTERVAL_MS) return;
    this.lastWarnAt = now;
    this.logger.warn(message);
  }

  private recordFailure(message: string): void {
    this.consecutiveFailures++;
    this.warnThrottled(`${message} — seguindo direto para a origem.`);

    if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
      this.consecutiveFailures = 0;
      this.logger.error(
        `Cache desativado por ${CIRCUIT_OPEN_MS / 1000}s após falhas consecutivas no Redis.`,
      );
    }
  }

  /** Runs a cache operation under a hard deadline, converting any failure or
   *  timeout into `undefined`. Never throws. */
  private async execute<T>(
    label: string,
    key: string,
    op: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T | undefined> {
    if (this.circuitOpen) return undefined;

    let timer: NodeJS.Timeout | undefined;
    try {
      const opPromise = op();
      // Once the timeout wins the race, a later rejection would otherwise
      // surface as an unhandled rejection and take the process down.
      opPromise.catch(() => undefined);

      const result = await Promise.race([
        opPromise,
        new Promise<typeof TIMED_OUT>((resolve) => {
          timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
        }),
      ]);

      if (result === TIMED_OUT) {
        this.recordFailure(`Cache: ${label} de "${key}" excedeu ${timeoutMs}ms`);
        return undefined;
      }

      this.consecutiveFailures = 0;
      return result as T;
    } catch (err) {
      this.recordFailure(`Cache: ${label} de "${key}" falhou: ${(err as Error).message}`);
      return undefined;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const hit = await this.execute<T | undefined>(
      'leitura',
      key,
      () => this.cache.get<T>(key),
      GET_TIMEOUT_MS,
    );
    // Nullish-only, so cached `0`, `''` and `false` survive as real hits.
    return hit ?? undefined;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.execute('escrita', key, () => this.cache.set(key, value, ttlMs), WRITE_TIMEOUT_MS);
  }

  /**
   * Best-effort invalidation. If Redis is unavailable the entry survives until
   * its TTL expires — stale, but bounded, and never a failed mutation.
   */
  async del(...keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        this.execute('invalidação', key, () => this.cache.del(key), WRITE_TIMEOUT_MS),
      ),
    );
  }

  /**
   * Read-through cache. `produce` runs only on a miss, and its result is stored
   * best-effort — a failed write never fails the request.
   *
   * `undefined` is not cacheable (it is indistinguishable from a miss), so a
   * producer returning `undefined` simply won't be memoized.
   */
  async getOrSet<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== undefined) return hit;

    const value = await produce();
    if (value !== undefined) {
      await this.set(key, value, ttlMs);
    }
    return value;
  }
}
