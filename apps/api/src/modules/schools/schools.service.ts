import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) { }

  async findAllActive(query?: { search?: string; state?: string; city?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 12;

    const where: any = {
      status: true,
      users: {
        some: {
          role: 'SCHOOL_MANAGER',
          roleStatus: 'APROVADO',
          status: true
        }
      }
    };

    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.state) {
      where.state = query.state;
    }
    if (query?.city) {
      where.city = query.city;
    }

    const totalCount = await this.prisma.school.count({ where });

    const data = await this.prisma.school.findMany({
      where,
      select: {
        id: true,
        name: true,
        state: true,
        city: true,
        location: true,
        description: true,
        coverImage: true,
        _count: {
          select: {
            trails: { where: { status: true } },
            followers: true
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      }
    };
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        id,
        status: true,
        users: {
          some: {
            role: 'SCHOOL_MANAGER',
            roleStatus: 'APROVADO',
            status: true
          }
        }
      },
      include: {
        _count: {
          select: {
            trails: { where: { status: true } },
            followers: true
          },
        },
        trails: {
          where: { status: true },
          select: {
            id: true,
            title: true,
            slug: true,
            shortDescription: true,
            city: true,
            coverImage: true,
            biome: true,
            distanceKm: true,
            difficulty: true,
            _count: { select: { likes: true, points: true } },
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!school) {
      throw new NotFoundException('Escola não encontrada.');
    }

    return school;
  }

  async toggleFollow(schoolId: string, userId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada.');

    const existingFollow = await this.prisma.schoolFollower.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    });

    if (existingFollow) {
      await this.prisma.schoolFollower.delete({ where: { id: existingFollow.id } });
      return { isFollowing: false };
    } else {
      await this.prisma.schoolFollower.create({ data: { schoolId, userId } });
      return { isFollowing: true };
    }
  }

  async getStatus(schoolId: string, userId: string) {
    const follower = await this.prisma.schoolFollower.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    });
    return { isFollowing: !!follower };
  }
}
