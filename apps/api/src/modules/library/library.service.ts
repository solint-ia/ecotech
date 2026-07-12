import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLibraryContentDto } from './dto/create-library-content.dto';
import { UpdateLibraryContentDto } from './dto/update-library-content.dto';
import { ApprovalStatus } from '@prisma/client';
import { AnalyticsCacheService } from '../../common/cache/analytics-cache.service';

@Injectable()
export class LibraryService {
  constructor(
    private prisma: PrismaService,
    private analyticsCache: AnalyticsCacheService,
  ) {}

  async findAll(query: { type?: string; search?: string; schoolId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip = (page - 1) * limit;

    const where: any = { 
      approvalStatus: ApprovalStatus.APROVADO,
      versionOfId: null 
    };

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
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async findOne(id: string, requestingUser?: { id: string; role: string; schoolId?: string }) {
    const content = await this.prisma.libraryContent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
            school: { select: { id: true, name: true } },
          },
        },
        school: { select: { id: true, name: true, coverImage: true } },
      }
    });

    if (!content) {
      throw new NotFoundException('Conteúdo não encontrado.');
    }

    return content;
  }

  async findMyMaterials(user: { id: string; schoolId?: string }, query: { status?: string, page?: number, limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip = (page - 1) * limit;

    const where: any = { userId: user.id };
    if (query.status === 'PUBLISHED') {
      where.approvalStatus = ApprovalStatus.APROVADO;
    } else if (query.status === 'REJECTED') {
      where.approvalStatus = ApprovalStatus.REPROVADO;
    } else if (query.status === 'PENDING') {
      where.approvalStatus = { in: [ApprovalStatus.PENDENTE, ApprovalStatus.REPROVADO] };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.libraryContent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.libraryContent.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      }
    };
  }

  async create(dto: CreateLibraryContentDto, user: { id: string; role: string; schoolId?: string }) {
    // Admin publishes directly; schools/teachers go to pending admin approval.
    const approvalStatus = user.role === 'ADMIN' ? ApprovalStatus.APROVADO : ApprovalStatus.PENDENTE;
    const publishedAt = user.role === 'ADMIN' ? new Date() : null;

    const created = await this.prisma.libraryContent.create({
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

    await this.analyticsCache.invalidate({ schoolId: created.schoolId });
    return created;
  }

  async update(id: string, dto: UpdateLibraryContentDto, user: { id: string; role: string; schoolId?: string }) {
    const content = await this.prisma.libraryContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Conteúdo não encontrado.');

    if (user.role !== 'ADMIN' && content.userId !== user.id) {
      throw new ForbiddenException('Não autorizado.');
    }

    // Commented out to allow direct edits instead of creating pending drafts:
    /*
    if (content.approvalStatus === 'APROVADO' && user.role !== 'ADMIN') {
      // Create a draft instead of editing directly
      return this.prisma.libraryContent.create({
        data: {
          title: dto.title ?? content.title,
          description: dto.description ?? content.description,
          contentType: dto.contentType ?? content.contentType,
          coverImage: dto.coverImage ?? content.coverImage,
          fileUrl: dto.fileUrl ?? content.fileUrl,
          videoUrl: dto.videoUrl ?? content.videoUrl,
          userId: user.id,
          schoolId: user.schoolId || null,
          approvalStatus: ApprovalStatus.PENDENTE,
          versionOfId: id,
        }
      });
    }
    */

    // Direct edit
    return this.prisma.libraryContent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        coverImage: dto.coverImage,
        fileUrl: dto.fileUrl,
        videoUrl: dto.videoUrl,
      }
    });
  }

  async updateStatus(id: string, status: ApprovalStatus) {
    const content = await this.prisma.libraryContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Conteúdo não encontrado.');

    if (status === ApprovalStatus.APROVADO && content.versionOfId) {
      // It's a draft being approved, overwrite the original
      await this.prisma.libraryContent.update({
        where: { id: content.versionOfId },
        data: {
          title: content.title,
          description: content.description,
          contentType: content.contentType,
          coverImage: content.coverImage,
          fileUrl: content.fileUrl,
          videoUrl: content.videoUrl,
        }
      });
      // Delete draft
      await this.prisma.libraryContent.delete({ where: { id } });
      await this.analyticsCache.invalidate({ schoolId: content.schoolId });
      return { success: true, message: 'Edição aprovada e rascunho removido.', id: content.versionOfId };
    }

    const updated = await this.prisma.libraryContent.update({
      where: { id },
      data: {
        approvalStatus: status,
        publishedAt: status === ApprovalStatus.APROVADO && !content.publishedAt ? new Date() : content.publishedAt,
      },
    });

    // Moves both totalLibrary/pendingLibrary (admin) and the school's libraryStats.
    await this.analyticsCache.invalidate({ schoolId: content.schoolId });
    return updated;
  }

  async getSubmissions(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL' && Object.values(ApprovalStatus).includes(query.status as ApprovalStatus)) {
      where.approvalStatus = query.status as ApprovalStatus;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.libraryContent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              school: { select: { id: true, name: true } },
            },
          },
          school: { select: { id: true, name: true } },
        }
      }),
      this.prisma.libraryContent.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async remove(id: string, user: { id: string; role: string; schoolId?: string }) {
    const content = await this.prisma.libraryContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Conteúdo não encontrado.');

    if (user.role !== 'ADMIN' && content.userId !== user.id && content.schoolId !== user.schoolId) {
      throw new ForbiddenException('Não autorizado.');
    }

    // This will cascade or just delete the main record. Since we don't have cascade on versionOfId by default in prisma,
    // we should delete drafts first if there are any, or just let prisma fail if not setup. We can manually delete drafts:
    await this.prisma.libraryContent.deleteMany({ where: { versionOfId: id } });

    const deleted = await this.prisma.libraryContent.delete({ where: { id } });
    await this.analyticsCache.invalidate({ schoolId: content.schoolId });
    return deleted;
  }
}
