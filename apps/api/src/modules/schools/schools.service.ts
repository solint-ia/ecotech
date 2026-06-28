import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findAllActive(query?: { search?: string; state?: string; city?: string }) {
    const where: any = { status: true };
    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.state) {
      where.state = query.state;
    }
    if (query?.city) {
      where.city = query.city;
    }

    return this.prisma.school.findMany({
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
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, status: true },
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
