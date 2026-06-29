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
        caption: createStoryDto.caption || null,
        location: createStoryDto.location || null,
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

  async updateStory(id: string, userId: string, caption?: string, location?: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new Error('Story não encontrado.');
    if (story.userId !== userId) {
      throw new Error('Sem permissão para editar este story.');
    }
    return this.prisma.story.update({
      where: { id },
      data: {
        caption: caption !== undefined ? caption : story.caption,
        location: location !== undefined ? location : story.location,
      },
    });
  }

  async addComment(storyId: string, userId: string, comment: string) {
    return this.prisma.storyComment.create({
      data: { storyId, userId, comment },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
      },
    });
  }

  async getComments(storyId: string) {
    return this.prisma.storyComment.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
      },
    });
  }

  async deleteComment(commentId: string, userId: string, role: string) {
    const comment = await this.prisma.storyComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comentário não encontrado.');
    if (comment.userId !== userId && role !== 'ADMIN') {
      throw new Error('Sem permissão para excluir.');
    }
    return this.prisma.storyComment.delete({ where: { id: commentId } });
  }
}
