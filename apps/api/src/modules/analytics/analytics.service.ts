import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Rounded average age, in years, from a list of birth dates. Users without a
   * birthDate are ignored; returns null when nobody has one (the UI shows "—"
   * instead of a misleading 0).
   */
  private averageAge(users: { birthDate: Date | null }[]): number | null {
    const now = new Date();
    const ages = users
      .map((u) => u.birthDate)
      .filter((d): d is Date => !!d)
      .map((d) => {
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        return age;
      })
      // Guard against typos / bad seed data skewing the average.
      .filter((age) => age >= 0 && age < 120);

    if (ages.length === 0) return null;
    return Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);
  }

  async getAdminMetrics() {
    // 1. Core Metrics (Counts)
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
      totalPartners
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
    ]);

    // Average ages, computed platform-wide for the admin.
    const [studentBirthDates, teacherBirthDates] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'STUDENT' }, select: { birthDate: true } }),
      this.prisma.user.findMany({ where: { role: 'TEACHER' }, select: { birthDate: true } }),
    ]);
    const avgStudentAge = this.averageAge(studentBirthDates);
    const avgTeacherAge = this.averageAge(teacherBirthDates);

    // 2. Rankings
    const topTrailsLiked = await this.prisma.trail.findMany({
      orderBy: { likesCount: 'desc' },
      take: 5,
      select: { id: true, slug: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
    });

    const topTrailsViewed = await this.prisma.trail.findMany({
      orderBy: { viewsCount: 'desc' },
      take: 5,
      select: { id: true, slug: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
    });

    const schoolsWithMostTrails = await this.prisma.school.findMany({
      orderBy: { trails: { _count: 'desc' } },
      take: 5,
      select: { id: true, name: true, city: true, state: true, _count: { select: { trails: true } } },
    });

    const schoolsWithMostFollowers = await this.prisma.school.findMany({
      orderBy: { followers: { _count: 'desc' } },
      take: 5,
      select: { id: true, name: true, city: true, state: true, _count: { select: { followers: true } } },
    });

    // 3. Recent Activities (Merge different tables manually for timeline)
    const [recentUsers, recentSchools, recentTrails, recentLibrary] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.trail.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
      this.prisma.libraryContent.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
    ]);

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

    // 1. Core Metrics
    const [
      totalTeachers,
      totalStudents,
      totalTrails,
      totalPosts,
      totalLibrary,
      libraryApproved,
      libraryPending,
      libraryRejected
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT' } }),
      this.prisma.trail.count({ where: { schoolId } }),
      this.prisma.feedPost.count({ where: { schoolId } }),
      this.prisma.libraryContent.count({ where: { schoolId } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'APROVADO' } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'PENDENTE' } }),
      this.prisma.libraryContent.count({ where: { schoolId, approvalStatus: 'REPROVADO' } }),
    ]);

    // Educational Points belong to trails that belong to this school
    const pointsQuery = await this.prisma.educationalPoint.count({
      where: { trail: { schoolId } }
    });
    const totalPoints = pointsQuery;

    // Average ages, scoped to the users linked to this school (same filter the
    // totalStudents/totalTeachers counters above use).
    const [studentBirthDates, teacherBirthDates] = await Promise.all([
      this.prisma.user.findMany({ where: { schoolId, role: 'STUDENT' }, select: { birthDate: true } }),
      this.prisma.user.findMany({ where: { schoolId, role: 'TEACHER' }, select: { birthDate: true } }),
    ]);
    const avgStudentAge = this.averageAge(studentBirthDates);
    const avgTeacherAge = this.averageAge(teacherBirthDates);

    // 2. Recent Submissions
    const recentSubmissions = await this.prisma.libraryContent.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, contentType: true, approvalStatus: true, createdAt: true }
    });

    // 3. Recent Activities
    const [recentUsers, recentTrails] = await Promise.all([
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
    const links = await this.prisma.teacherSchool.findMany({
      where: { teacherId, status: 'APROVADO' },
      select: { schoolId: true },
    });
    const schoolIds = links.map((l) => l.schoolId);

    if (schoolIds.length === 0) {
      return { metrics: { avgStudentAge: null, avgTeacherAge: null } };
    }

    const [studentBirthDates, teacherBirthDates] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'STUDENT', schoolId: { in: schoolIds } },
        select: { birthDate: true },
      }),
      // Teachers reach a school through the N:N link, not through user.schoolId.
      this.prisma.user.findMany({
        where: { teacherSchools: { some: { schoolId: { in: schoolIds }, status: 'APROVADO' } } },
        select: { birthDate: true },
      }),
    ]);

    return {
      metrics: {
        avgStudentAge: this.averageAge(studentBirthDates),
        avgTeacherAge: this.averageAge(teacherBirthDates),
      },
    };
  }
}
