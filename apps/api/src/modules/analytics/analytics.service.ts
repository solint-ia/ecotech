import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

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

    // 2. Rankings
    const topTrailsLiked = await this.prisma.trail.findMany({
      orderBy: { likesCount: 'desc' },
      take: 5,
      select: { id: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
    });

    const topTrailsViewed = await this.prisma.trail.findMany({
      orderBy: { viewsCount: 'desc' },
      take: 5,
      select: { id: true, title: true, likesCount: true, viewsCount: true, biome: true, city: true, state: true },
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
    const [recentUsers, recentSchools, recentTrails, recentPosts, recentLibrary] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, name: true, createdAt: true } }),
      this.prisma.trail.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
      this.prisma.feedPost.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
      this.prisma.libraryContent.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
    ]);

    const activities = [
      ...recentUsers.map(u => ({ type: 'USER', label: `Novo usuário: ${u.name}`, date: u.createdAt })),
      ...recentSchools.map(s => ({ type: 'SCHOOL', label: `Nova escola: ${s.name}`, date: s.createdAt })),
      ...recentTrails.map(t => ({ type: 'TRAIL', label: `Nova trilha: ${t.title}`, date: t.createdAt })),
      ...recentPosts.map(p => ({ type: 'POST', label: `Nova publicação: ${p.title}`, date: p.createdAt })),
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
        totalPartners
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

    // 2. Recent Submissions
    const recentSubmissions = await this.prisma.libraryContent.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, contentType: true, approvalStatus: true, createdAt: true }
    });

    // 3. Recent Activities
    const [recentUsers, recentTrails, recentPosts] = await Promise.all([
      this.prisma.user.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, name: true, role: true, createdAt: true } }),
      this.prisma.trail.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
      this.prisma.feedPost.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, createdAt: true } }),
    ]);

    const activities = [
      ...recentUsers.map(u => ({ type: 'USER', label: `Novo ${u.role === 'TEACHER' ? 'professor' : 'estudante'}: ${u.name}`, date: u.createdAt })),
      ...recentTrails.map(t => ({ type: 'TRAIL', label: `Nova trilha criada: ${t.title}`, date: t.createdAt })),
      ...recentPosts.map(p => ({ type: 'POST', label: `Nova publicação: ${p.title}`, date: p.createdAt })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return {
      metrics: {
        totalTeachers,
        totalStudents,
        totalTrails,
        totalPoints,
        totalPosts,
        totalLibrary,
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
}
