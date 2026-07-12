import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { ANALYTICS_TTL_MS, analyticsKeys } from '../../common/cache/analytics-cache.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  /**
   * Rounded average age in years, computed entirely in Postgres.
   *
   * `AGE(birthDate)` yields an interval since today, and EXTRACT(YEAR ...) turns
   * it into completed years — the same "birthday hasn't happened yet" semantics
   * the UI expects. Doing this in SQL returns a single scalar instead of
   * streaming every user's birth date into Node just to average it.
   *
   * The `::date` cast is load-bearing: AGE() measures against current_date
   * (midnight), so a birthDate carrying any time-of-day yields "N-1 years, 11
   * months, …" and EXTRACT truncates it to N-1 — reporting everyone a year
   * young on their birthday. Dropping the time makes both sides midnight.
   *
   * Returns null when nobody matches, so the UI can render "—" rather than a
   * misleading 0. Ages outside 0..120 are dropped so a typo'd birth date cannot
   * skew the average.
   */
  private async averageAge(where: Prisma.Sql): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ avg: number | null }[]>(Prisma.sql`
      SELECT AVG(EXTRACT(YEAR FROM AGE(u."birthDate"::date)))::float8 AS avg
      FROM "User" u
      WHERE u."birthDate" IS NOT NULL
        AND u."birthDate" <= NOW()::timestamp
        AND u."birthDate" > (NOW() - INTERVAL '120 years')::timestamp
        AND (${where})
    `);

    const avg = rows[0]?.avg;
    return avg === null || avg === undefined ? null : Math.round(avg);
  }

  private readonly isStudent = Prisma.sql`u."role" = 'STUDENT'::"Role"`;
  private readonly isTeacher = Prisma.sql`u."role" = 'TEACHER'::"Role"`;

  async getAdminMetrics() {
    return this.cache.getOrSet(analyticsKeys.admin, ANALYTICS_TTL_MS, () =>
      this.computeAdminMetrics(),
    );
  }

  private async computeAdminMetrics() {
    // Everything below is independent, so it goes out in one parallel batch
    // instead of serially round-tripping to Postgres.
    const [
      totalUsers,
      totalSchools,
      totalTeachers,
      totalStudents,
      totalTrails,
      totalPoints,
      totalPosts,
      totalLibrary,
      pendingLibrary,
      totalPartners,
      pendingPartners,
      pendingTrails,
      pendingStudents,
      pendingManagers,
      pendingTeacherLinks,
      avgStudentAge,
      avgTeacherAge,
      topTrailsLiked,
      topTrailsViewed,
      schoolsWithMostTrails,
      schoolsWithMostFollowers,
      recentUsers,
      recentSchools,
      recentTrails,
      recentLibrary,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.school.count(),
      this.prisma.user.count({ where: { role: 'TEACHER' } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.trail.count(),
      this.prisma.educationalPoint.count(),
      this.prisma.feedPost.count(),
      this.prisma.libraryContent.count(),
      this.prisma.libraryContent.count({ where: { approvalStatus: 'PENDENTE' } }),
      this.prisma.partner.count(),
      this.prisma.partner.count({ where: { approvalStatus: 'PENDENTE' } }),
      // Drafts never reach the approval queue, so they are not pending on anyone.
      this.prisma.trail.count({ where: { approvalStatus: 'PENDENTE', isDraft: false } }),
      // Mirrors UsersService.getPendingUsers for the ADMIN branch: pending
      // students, pending school managers and pending teacher-school links.
      this.prisma.user.count({
        where: { role: 'STUDENT', roleStatus: 'PENDENTE', schoolId: { not: null } },
      }),
      this.prisma.user.count({ where: { role: 'SCHOOL_MANAGER', roleStatus: 'PENDENTE' } }),
      this.prisma.teacherSchool.count({ where: { status: 'PENDENTE' } }),
      this.averageAge(this.isStudent),
      this.averageAge(this.isTeacher),
      this.prisma.trail.findMany({
        orderBy: { likesCount: 'desc' },
        take: 5,
        select: { id: true, slug: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
      }),
      this.prisma.trail.findMany({
        orderBy: { viewsCount: 'desc' },
        take: 5,
        select: { id: true, slug: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
      }),
      this.prisma.school.findMany({
        orderBy: { trails: { _count: 'desc' } },
        take: 5,
        select: { id: true, name: true, city: true, state: true, _count: { select: { trails: true } } },
      }),
      this.prisma.school.findMany({
        orderBy: { followers: { _count: 'desc' } },
        take: 5,
        select: { id: true, name: true, city: true, state: true, _count: { select: { followers: true } } },
      }),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.trail.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
      this.prisma.libraryContent.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
    ]);

    // Everything sitting in an admin approval queue, so the dashboard can point
    // at each one instead of only counting users.
    const pendingUsers = pendingStudents + pendingManagers + pendingTeacherLinks;
    const pending = {
      users: pendingUsers,
      library: pendingLibrary,
      trails: pendingTrails,
      partners: pendingPartners,
      total: pendingUsers + pendingLibrary + pendingTrails + pendingPartners,
    };

    const activities = [
      ...recentUsers.map(u => ({ type: 'USER', label: `Novo usuário: ${u.name}`, date: u.createdAt })),
      ...recentSchools.map(s => ({ type: 'SCHOOL', label: `Nova escola: ${s.name}`, date: s.createdAt })),
      ...recentTrails.map(t => ({ type: 'TRAIL', label: `Nova trilha: ${t.title}`, date: t.createdAt })),
      ...recentLibrary.map(l => ({ type: 'LIBRARY', label: `Novo material: ${l.title}`, date: l.createdAt })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return {
      metrics: {
        totalUsers,
        totalSchools,
        totalTeachers,
        totalStudents,
        totalTrails,
        totalPoints,
        totalPosts,
        totalLibrary,
        pendingLibrary,
        totalPartners,
        avgStudentAge,
        avgTeacherAge
      },
      pending,
      rankings: {
        topTrailsLiked,
        topTrailsViewed,
        schoolsWithMostTrails,
        schoolsWithMostFollowers,
      },
      activities
    };
  }

  async getSchoolMetrics(schoolId: string) {
    if (!schoolId) return null;

    return this.cache.getOrSet(analyticsKeys.school(schoolId), ANALYTICS_TTL_MS, () =>
      this.computeSchoolMetrics(schoolId),
    );
  }

  private async computeSchoolMetrics(schoolId: string) {
    const [
      totalTeachers,
      totalStudents,
      totalTrails,
      totalPosts,
      totalLibrary,
      libraryApproved,
      libraryPending,
      libraryRejected,
      totalPoints,
      avgStudentAge,
      avgTeacherAge,
      recentSubmissions,
      recentUsers,
      recentTrails,
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT' } }),
      this.prisma.trail.count({ where: { schoolId } }),
      this.prisma.feedPost.count({ where: { schoolId } }),
      this.prisma.libraryContent.count({ where: { schoolId } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'APROVADO' } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'PENDENTE' } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'REPROVADO' } }),
      // Educational Points belong to trails that belong to this school
      this.prisma.educationalPoint.count({ where: { trail: { schoolId } } }),
      // Same filter the totalStudents/totalTeachers counters above use, so the
      // averages always agree with the counts shown next to them.
      this.averageAge(Prisma.sql`${this.isStudent} AND u."schoolId" = ${schoolId}`),
      this.averageAge(Prisma.sql`${this.isTeacher} AND u."schoolId" = ${schoolId}`),
      this.prisma.libraryContent.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, contentType: true, approvalStatus: true, createdAt: true }
      }),
      this.prisma.user.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, name: true, role: true, createdAt: true } }),
      this.prisma.trail.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
    ]);

    const activities = [
      ...recentUsers.map(u => ({ type: 'USER', label: `Novo ${u.role === 'TEACHER' ? 'professor' : 'estudante'}: ${u.name}`, date: u.createdAt })),
      ...recentTrails.map(t => ({ type: 'TRAIL', label: `Nova trilha criada: ${t.title}`, date: t.createdAt })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return {
      metrics: {
        totalTeachers,
        totalStudents,
        totalTrails,
        totalPoints,
        totalPosts,
        totalLibrary,
        avgStudentAge,
        avgTeacherAge,
      },
      libraryStats: {
        approved: libraryApproved,
        pending: libraryPending,
        rejected: libraryRejected,
        recent: recentSubmissions,
      },
      activities
    };
  }

  /**
   * Average ages scoped to the schools where this teacher has an APPROVED link
   * — the same scope that governs everything else a teacher can see.
   */
  async getTeacherMetrics(teacherId: string) {
    return this.cache.getOrSet(analyticsKeys.teacher(teacherId), ANALYTICS_TTL_MS, () =>
      this.computeTeacherMetrics(teacherId),
    );
  }

  private async computeTeacherMetrics(teacherId: string) {
    const links = await this.prisma.teacherSchool.findMany({
      where: { teacherId, status: 'APROVADO' },
      select: { schoolId: true },
    });
    const schoolIds = links.map((l) => l.schoolId);

    if (schoolIds.length === 0) {
      return { metrics: { avgStudentAge: null, avgTeacherAge: null } };
    }

    const schools = Prisma.join(schoolIds);

    const [avgStudentAge, avgTeacherAge] = await Promise.all([
      this.averageAge(Prisma.sql`${this.isStudent} AND u."schoolId" IN (${schools})`),
      // Teachers reach a school through the N:N link, not through user.schoolId.
      this.averageAge(Prisma.sql`
        EXISTS (
          SELECT 1 FROM "TeacherSchool" ts
          WHERE ts."teacherId" = u."id"
            AND ts."status" = 'APROVADO'::"ApprovalStatus"
            AND ts."schoolId" IN (${schools})
        )
      `),
    ]);

    return { metrics: { avgStudentAge, avgTeacherAge } };
  }
}
