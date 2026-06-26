import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(userId: string, createStoryDto: CreateStoryDto, mediaUrl: string) {
    // 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return this.prisma.story.create({
      data: {
        userId,
        mediaUrl,
        mediaType: 'IMAGE',
        expiresAt,
        schoolId: createStoryDto.schoolId || null,
      },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
      },
    });
  }

  async findActiveStories() {
    return this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
      },
    });
  }

  async deleteStory(id: string, userId: string, role: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new Error('Story não encontrado.');
    if (story.userId !== userId && role !== 'ADMIN') {
      throw new Error('Sem permissão para excluir este story.');
    }
    return this.prisma.story.delete({ where: { id } });
  }
}
