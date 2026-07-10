import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from './cache.service';

/** Dashboards are not real-time; 5 minutes is a safe backstop behind the
 *  targeted invalidation below. */
export const ANALYTICS_TTL_MS = 5 * 60 * 1000;

export const analyticsKeys = {
  admin: 'analytics:admin',
  school: (schoolId: string) => `analytics:school:${schoolId}`,
  teacher: (teacherId: string) => `analytics:teacher:${teacherId}`,
};

/**
 * Targeted invalidation for the analytics dashboards.
 *
 * Scope rules, mirroring what each dashboard actually aggregates:
 * - the admin dashboard aggregates everything, so *any* structural write drops it;
 * - a school dashboard only drops when its own school changes;
 * - a teacher dashboard aggregates the schools where the teacher is approved, so
 *   a change in school X drops the dashboards of every teacher linked to X.
 *
 * Deliberately NOT invalidated: trail views and likes. Those counters move on
 * every page view and only feed the admin rankings, so invalidating on them
 * would keep the cache permanently cold. The TTL absorbs that staleness.
 */
@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Drops every cached view affected by a write. Never throws — the mutation has
   * already been committed, and a stale entry (bounded by the TTL) must never
   * turn a successful write into a failed request.
   */
  async invalidate(
    opts: { schoolId?: string | null; teacherIds?: string[] } = {},
  ): Promise<void> {
    try {
      const keys = new Set<string>([analyticsKeys.admin]);

      if (opts.schoolId) {
        keys.add(analyticsKeys.school(opts.schoolId));

        const links = await this.prisma.teacherSchool.findMany({
          where: { schoolId: opts.schoolId },
          select: { teacherId: true },
        });
        for (const link of links) keys.add(analyticsKeys.teacher(link.teacherId));
      }

      for (const teacherId of opts.teacherIds ?? []) {
        keys.add(analyticsKeys.teacher(teacherId));
      }

      await this.cache.del(...keys);
    } catch (err) {
      this.logger.warn(
        `Falha ao invalidar cache de analytics: ${(err as Error).message}`,
      );
    }
  }
}
