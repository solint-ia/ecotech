import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLibraryContentDto } from './dto/create-library-content.dto';
import { UpdateLibraryContentDto } from './dto/update-library-content.dto';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { type?: string; search?: string; schoolId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip = (page - 1) * limit;

    const where: any = { approvalStatus: ApprovalStatus.APROVADO };

    if (query.type) where.contentType = query.type;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.libraryContent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, profileImage: true } },
          school: { select: { id: true, name: true, coverImage: true } },
        }
      }),
      this.prisma.libraryContent.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, requestingUser?: { id: string; role: string; schoolId?: string }) {
    const content = await this.prisma.libraryContent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        school: { select: { id: true, name: true, coverImage: true } },
      }
    });

    if (!content) {
      throw new NotFoundException('Conteúdo não encontrado.');
    }

    return content;
  }

  async create(dto: CreateLibraryContentDto, user: { id: string; role: string; schoolId?: string }) {
    // Admin directly publishes. Others send to pending.
    const approvalStatus = user.role === 'ADMIN' ? ApprovalStatus.APROVADO : ApprovalStatus.PENDENTE;
    const publishedAt = user.role === 'ADMIN' ? new Date() : null;

    return this.prisma.libraryContent.create({
      data: {
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        coverImage: dto.coverImage ?? '',
        fileUrl: dto.fileUrl,
        videoUrl: dto.videoUrl,
        userId: user.id,
        schoolId: user.schoolId || null,
        approvalStatus,
        publishedAt,
      },
    });
  }

  async updateStatus(id: string, status: ApprovalStatus) {
    const content = await this.prisma.libraryContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Conteúdo não encontrado.');

    return this.prisma.libraryContent.update({
      where: { id },
      data: {
        approvalStatus: status,
        publishedAt: status === ApprovalStatus.APROVADO ? new Date() : null,
      },
    });
  }

  async getSubmissions(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.libraryContent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          school: { select: { id: true, name: true } },
        }
      }),
      this.prisma.libraryContent.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async remove(id: string, user: { id: string; role: string; schoolId?: string }) {
    const content = await this.prisma.libraryContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Conteúdo não encontrado.');

    if (user.role !== 'ADMIN' && content.userId !== user.id && content.schoolId !== user.schoolId) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.prisma.libraryContent.delete({ where: { id } });
  }
}
