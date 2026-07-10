import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsCacheService } from '../../common/cache/analytics-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { ApprovalStatus } from '@prisma/client';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class TrailsService {
  constructor(
    private prisma: PrismaService,
    private analyticsCache: AnalyticsCacheService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    state?: string;
    city?: string;
    biome?: string;
    difficulty?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip = (page - 1) * limit;

    const where: any = { status: true, approvalStatus: ApprovalStatus.APROVADO };

    if (query.state) where.state = query.state;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.biome) where.biome = { contains: query.biome, mode: 'insensitive' };
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.trail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          shortDescription: true,
          state: true,
          city: true,
          coverImage: true,
          biome: true,
          distanceKm: true,
          duration: true,
          difficulty: true,
          school: { select: { id: true, name: true } },
          _count: { select: { likes: true, points: true } },
          viewsCount: true,
          likesCount: true,
        },
      }),
      this.prisma.trail.count({ where }),
    ]);

    const mappedData = data.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        _count: {
          likes: _count.likes,
          points: _count.points,
          educationalPoints: _count.points,
        },
      };
    });

    return {
      data: mappedData,
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async findBySlug(slug: string) {
    const trail = await this.prisma.trail.findFirst({
      where: { slug },
      include: {
        school: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true } },
        biodiversity: true,
        photos: { orderBy: { createdAt: 'desc' } },
        points: {
          where: { status: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            order: true,
            shortDescription: true,
            mainImage: true,
          },
        },
        _count: { select: { likes: true } },
      },
    });

    if (!trail) {
      throw new NotFoundException('Trilha não encontrada.');
    }

    // Increment view count asynchronously (fire and forget)
    this.prisma.trail
      .update({ where: { id: trail.id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => {}); // Fail silently

    const { points, ...rest } = trail;
    return {
      ...rest,
      points,
      educationalPoints: points,
    };
  }

  async findDrafts(userId: string) {
    const where: any = { isDraft: true, createdById: userId };

    const data = await this.prisma.trail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        state: true,
        city: true,
        coverImage: true,
        biome: true,
        distanceKm: true,
        duration: true,
        difficulty: true,
        status: true,
        approvalStatus: true,
        school: { select: { id: true, name: true } },
        _count: { select: { likes: true, points: true } },
        viewsCount: true,
        likesCount: true,
      },
    });

    const mappedData = data.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        _count: {
          likes: _count.likes,
          points: _count.points,
          educationalPoints: _count.points,
        },
      };
    });

    return {
      data: mappedData,
      meta: {
        totalCount: mappedData.length,
        totalPages: 1,
        currentPage: 1,
        limit: 100,
      },
    };
  }

  async findMyTrails(userId: string) {
    const where: any = { createdById: userId };

    const data = await this.prisma.trail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        state: true,
        city: true,
        coverImage: true,
        biome: true,
        distanceKm: true,
        duration: true,
        difficulty: true,
        status: true,
        approvalStatus: true,
        school: { select: { id: true, name: true } },
        _count: { select: { likes: true, points: true } },
        viewsCount: true,
        likesCount: true,
      },
    });

    const mappedData = data.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        _count: {
          likes: _count.likes,
          points: _count.points,
          educationalPoints: _count.points,
        },
      };
    });

    return {
      data: mappedData,
      meta: {
        totalCount: mappedData.length,
        totalPages: 1,
        currentPage: 1,
        limit: 100,
      },
    };
  }

  async findSaved(userId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip = (page - 1) * limit;

    // Only surface saved trails that are actually live: published (status) and
    // approved. Drafts / pending / rejected trails must not appear here.
    const savedWhere = {
      userId,
      trail: { status: true, approvalStatus: ApprovalStatus.APROVADO },
    };

    const [saved, total] = await this.prisma.$transaction([
      this.prisma.savedTrail.findMany({
        where: savedWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          trail: {
            select: {
              id: true,
              title: true,
              slug: true,
              shortDescription: true,
              state: true,
              city: true,
              coverImage: true,
              biome: true,
              distanceKm: true,
              duration: true,
              difficulty: true,
              school: { select: { id: true, name: true } },
              _count: { select: { likes: true, points: true } },
              viewsCount: true,
              likesCount: true,
            },
          },
        },
      }),
      this.prisma.savedTrail.count({ where: savedWhere }),
    ]);

    const mappedData = saved.map(({ trail }) => {
      const { _count, ...rest } = trail;
      return {
        ...rest,
        _count: {
          likes: _count.likes,
          points: _count.points,
          educationalPoints: _count.points,
        },
      };
    });

    return {
      data: mappedData,
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async findAllForAdmin(query: { page?: number; limit?: number; schoolId?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.schoolId) where.schoolId = query.schoolId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.trail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          state: true,
          city: true,
          biome: true,
          difficulty: true,
          status: true,
          approvalStatus: true,
          school: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
      this.prisma.trail.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    };
  }

  /** Admin-only: trails for moderation. Returns all by default; can be filtered
   * by approval status (PENDENTE / APROVADO / REPROVADO). */
  async getSubmissions(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const skip = (page - 1) * limit;

    // Drafts (creator hasn't submitted for publication) never reach the queue.
    const where: any = { isDraft: false };
    if (query.status && query.status !== 'ALL' && Object.values(ApprovalStatus).includes(query.status as ApprovalStatus)) {
      where.approvalStatus = query.status as ApprovalStatus;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.trail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          state: true,
          city: true,
          biome: true,
          difficulty: true,
          coverImage: true,
          status: true,
          approvalStatus: true,
          createdAt: true,
          school: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.trail.count({ where }),
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

  /** Admin-only: approve or reject a trail. Approving also publishes it. */
  async updateApprovalStatus(id: string, status: ApprovalStatus) {
    const trail = await this.prisma.trail.findUnique({ where: { id } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    const updated = await this.prisma.trail.update({
      where: { id },
      data: {
        approvalStatus: status,
        // Publish on approval; unpublish on rejection.
        status: status === ApprovalStatus.APROVADO,
      },
    });

    await this.analyticsCache.invalidate({ schoolId: updated.schoolId });
    return { success: true, trail: { id: updated.id, approvalStatus: updated.approvalStatus, status: updated.status } };
  }

  async create(dto: CreateTrailDto, requestingUser: { id: string; role: string; schoolId?: string }) {
    // Validate school ownership: SCHOOL_MANAGER can only create trails for their school
    if (requestingUser.role === 'SCHOOL_MANAGER') {
      if (!requestingUser.schoolId) {
        throw new ForbiddenException('Você precisa estar vinculado a uma escola para criar trilhas.');
      }
      dto.schoolId = requestingUser.schoolId;
    }

    // A teacher can only create trails for a school where they are approved.
    if (requestingUser.role === 'TEACHER') {
      if (!dto.schoolId) {
        throw new BadRequestException('Selecione uma das suas escolas para criar a trilha.');
      }
      const link = await this.prisma.teacherSchool.findFirst({
        where: { teacherId: requestingUser.id, schoolId: dto.schoolId, status: 'APROVADO' },
      });
      if (!link) {
        throw new ForbiddenException('Você só pode criar trilhas para escolas onde é professor aprovado.');
      }
    }

    // Admin trails are published directly; schools/teachers go to pending admin
    // approval (kept unpublished until approved). When the creator leaves
    // "Publicar" unchecked the trail is a draft and stays out of the approval
    // queue until it is later submitted for publication.
    const isAdmin = requestingUser.role === 'ADMIN';
    const wantsToPublish = dto.status ?? false;
    const isDraft = !wantsToPublish;
    const approvalStatus = isAdmin ? ApprovalStatus.APROVADO : ApprovalStatus.PENDENTE;
    const publishStatus = isAdmin ? wantsToPublish : false;

    // Validate that the school exists if provided
    if (dto.schoolId) {
      const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
      if (!school) {
        throw new BadRequestException('Escola não encontrada.');
      }
    }

    // Generate unique slug from title
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.prisma.trail.findFirst({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const trail = await this.prisma.trail.create({
      data: {
        title: dto.title,
        slug,
        state: dto.state || null,
        city: dto.city,
        shortDescription: dto.shortDescription ?? '',
        fullDescription: dto.fullDescription ?? '',
        schoolId: dto.schoolId || null,
        createdById: requestingUser.id,
        biome: dto.biome ?? '',
        distanceKm: dto.distanceKm ?? 0,
        duration: dto.duration ?? '',
        difficulty: dto.difficulty as any ?? 'FACIL',
        coverImage: dto.coverImage ?? '',
        wikilocUrl: dto.wikilocUrl,
        safetyWarnings: dto.safetyWarnings,
        status: publishStatus,
        isDraft,
        approvalStatus,
      },
      include: { school: { select: { id: true, name: true } } },
    });
    
    await this.analyticsCache.invalidate({ schoolId: trail.schoolId });
    return trail;
  }

  async update(
    id: string,
    dto: UpdateTrailDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const trail = await this.prisma.trail.findUnique({ where: { id } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    if (requestingUser.role === 'SCHOOL_MANAGER') {
      if (trail.schoolId !== requestingUser.schoolId) {
        throw new ForbiddenException('Você não tem permissão para editar esta trilha.');
      }
    }

    const updatedTrail = await this.prisma.trail.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.city && { city: dto.city }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription }),
        ...(dto.biome !== undefined && { biome: dto.biome }),
        ...(dto.distanceKm !== undefined && { distanceKm: dto.distanceKm }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.difficulty && { difficulty: dto.difficulty as any }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.wikilocUrl !== undefined && { wikilocUrl: dto.wikilocUrl }),
        ...(dto.safetyWarnings !== undefined && { safetyWarnings: dto.safetyWarnings }),
        ...(dto.status !== undefined && { status: dto.status }),
        // Submitting for publication takes the trail out of draft state so it
        // enters the admin approval queue.
        ...(dto.status === true && { isDraft: false }),
        ...(dto.schoolId !== undefined && requestingUser.role === 'ADMIN' && { schoolId: dto.schoolId || null }),
      },
    });

    // An admin can move a trail between schools, so both dashboards go stale.
    await this.analyticsCache.invalidate({ schoolId: trail.schoolId });
    if (updatedTrail.schoolId !== trail.schoolId) {
      await this.analyticsCache.invalidate({ schoolId: updatedTrail.schoolId });
    }
    return updatedTrail;
  }

  async remove(id: string, requestingUser: { id: string; role: string; schoolId?: string }) {
    const trail = await this.prisma.trail.findUnique({ where: { id } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para excluir esta trilha.');
    }

    await this.prisma.trail.delete({ where: { id } });
    await this.analyticsCache.invalidate({ schoolId: trail.schoolId });
  }

  async getBiomes(): Promise<string[]> {
    const trails = await this.prisma.trail.findMany({
      where: { status: true },
      select: { biome: true },
      distinct: ['biome'],
    });
    return trails
      .map((t) => t.biome)
      .filter((b): b is string => typeof b === 'string' && b.length > 0);
  }

  async toggleLike(trailId: string, userId: string) {
    const trail = await this.prisma.trail.findUnique({ where: { id: trailId } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    const existingLike = await this.prisma.trailLike.findUnique({
      where: { trailId_userId: { trailId, userId } },
    });

    if (existingLike) {
      await this.prisma.trailLike.delete({ where: { id: existingLike.id } });
      await this.prisma.trail.update({
        where: { id: trailId },
        data: { likesCount: { decrement: 1 } },
      });
      return { isLiked: false };
    } else {
      await this.prisma.trailLike.create({ data: { trailId, userId } });
      await this.prisma.trail.update({
        where: { id: trailId },
        data: { likesCount: { increment: 1 } },
      });
      return { isLiked: true };
    }
  }

  async toggleSave(trailId: string, userId: string) {
    const trail = await this.prisma.trail.findUnique({ where: { id: trailId } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    const existingSave = await this.prisma.savedTrail.findUnique({
      where: { trailId_userId: { trailId, userId } },
    });

    if (existingSave) {
      await this.prisma.savedTrail.delete({ where: { id: existingSave.id } });
      return { isSaved: false };
    } else {
      await this.prisma.savedTrail.create({ data: { trailId, userId } });
      return { isSaved: true };
    }
  }

  async getStatus(trailId: string, userId: string) {
    const [like, saved] = await Promise.all([
      this.prisma.trailLike.findUnique({ where: { trailId_userId: { trailId, userId } } }),
      this.prisma.savedTrail.findUnique({ where: { trailId_userId: { trailId, userId } } }),
    ]);

    return {
      isLiked: !!like,
      isSaved: !!saved,
    };
  }

  async addPhoto(trailId: string, imagePath: string, user: { id: string; role: string; schoolId?: string }) {
    const trail = await this.prisma.trail.findUnique({ where: { id: trailId } });
    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    // Authorize: Admin or owning School Manager
    if (user.role !== 'ADMIN' && trail.schoolId !== user.schoolId) {
      throw new ForbiddenException('Não autorizado a adicionar fotos nesta trilha.');
    }

    return this.prisma.trailPhoto.create({
      data: {
        trailId,
        image: imagePath,
      },
    });
  }

  async removePhoto(photoId: string, user: { id: string; role: string; schoolId?: string }) {
    const photo = await this.prisma.trailPhoto.findUnique({
      where: { id: photoId },
      include: { trail: true },
    });

    if (!photo) throw new NotFoundException('Foto não encontrada.');

    // Authorize: Admin or owning School Manager
    if (user.role !== 'ADMIN' && photo.trail.schoolId !== user.schoolId) {
      throw new ForbiddenException('Não autorizado a remover esta foto.');
    }

    return this.prisma.trailPhoto.delete({ where: { id: photoId } });
  }
}

