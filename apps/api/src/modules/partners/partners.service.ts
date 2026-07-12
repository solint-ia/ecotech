import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertCanManagePartner,
  canManagePartner,
  RequestingUser,
} from '../../common/authorization/content-ownership';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { validateOpeningHours } from './opening-hours.util';
import { AnalyticsCacheService } from '../../common/cache/analytics-cache.service';

/** Who registered the partner — lets the admin see who submitted each entry. */
const CREATED_BY_SELECT = {
  select: {
    id: true,
    name: true,
    role: true,
    school: { select: { id: true, name: true } },
  },
} as const;

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsCache: AnalyticsCacheService,
  ) {}

  async create(createPartnerDto: CreatePartnerDto, user: RequestingUser) {
    validateOpeningHours(createPartnerDto.openingHours);

    // Admins publish directly; schools/teachers go to the admin approval queue.
    const isAdmin = user.role === 'ADMIN';

    const partner = await this.prisma.partner.create({
      data: {
        ...createPartnerDto,
        coverImage: createPartnerDto.coverImage || '',
        openingHours: createPartnerDto.openingHours as unknown as Prisma.InputJsonValue,
        approvalStatus: isAdmin ? ApprovalStatus.APROVADO : ApprovalStatus.PENDENTE,
        createdById: user.id,
      },
    });

    // Moves totalPartners and pendingPartners on the admin dashboard.
    await this.analyticsCache.invalidate();
    return partner;
  }

  async findAll(
    category?: string,
    state?: string,
    city?: string,
    includeInactive?: boolean,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const where: Prisma.PartnerWhereInput = {
      // The public directory only lists partners the admin has approved.
      approvalStatus: ApprovalStatus.APROVADO,
      ...(includeInactive ? {} : { status: true }),
      ...(category && { category }),
      ...(state && { state }),
      ...(city && { city }),
      // Search by partner name only.
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const totalCount = await this.prisma.partner.count({ where });

    const data = await this.prisma.partner.findMany({
      where,
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
      },
    };
  }

  /** Partners registered by the current user, whatever their approval status. */
  async findMine(user: RequestingUser, query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 12);

    const where: Prisma.PartnerWhereInput = {
      createdById: user.id,
      ...(query.status &&
        query.status !== 'ALL' &&
        Object.values(ApprovalStatus).includes(query.status as ApprovalStatus) && {
          approvalStatus: query.status as ApprovalStatus,
        }),
    };

    const [data, totalCount] = await this.prisma.$transaction([
      this.prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    };
  }

  /** Admin moderation queue: every partner, whatever its approval status. */
  async getSubmissions(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);

    const where: Prisma.PartnerWhereInput = {};
    if (
      query.status &&
      query.status !== 'ALL' &&
      Object.values(ApprovalStatus).includes(query.status as ApprovalStatus)
    ) {
      where.approvalStatus = query.status as ApprovalStatus;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, totalCount] = await this.prisma.$transaction([
      this.prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { createdBy: CREATED_BY_SELECT },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * A partner still awaiting approval (or rejected) is only readable by the
   * admin and by whoever registered it — otherwise the detail page would be a
   * way around the moderation queue.
   */
  async findOne(id: string, user?: RequestingUser) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        photos: true,
        createdBy: CREATED_BY_SELECT,
      },
    });

    if (!partner) {
      throw new NotFoundException('Parceiro não encontrado.');
    }

    const isPublic = partner.approvalStatus === ApprovalStatus.APROVADO;
    if (!isPublic && !(user && canManagePartner(user, partner))) {
      throw new NotFoundException('Parceiro não encontrado.');
    }

    return partner;
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto, user: RequestingUser) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!partner) throw new NotFoundException('Parceiro não encontrado.');

    assertCanManagePartner(user, partner, 'Você não tem permissão para editar este parceiro.');

    if (updatePartnerDto.openingHours) {
      validateOpeningHours(updatePartnerDto.openingHours);
    }

    return this.prisma.partner.update({
      where: { id },
      data: {
        ...updatePartnerDto,
        openingHours: updatePartnerDto.openingHours as unknown as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  }

  /** Admin-only: approve or reject a submitted partner. */
  async updateStatus(id: string, status: ApprovalStatus) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!partner) throw new NotFoundException('Parceiro não encontrado.');

    const updated = await this.prisma.partner.update({
      where: { id },
      data: { approvalStatus: status },
    });

    await this.analyticsCache.invalidate();
    return updated;
  }

  async remove(id: string, user: RequestingUser) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!partner) throw new NotFoundException('Parceiro não encontrado.');

    assertCanManagePartner(user, partner, 'Você não tem permissão para excluir este parceiro.');

    const deleted = await this.prisma.partner.delete({ where: { id } });

    await this.analyticsCache.invalidate();
    return deleted;
  }

  async addPhoto(partnerId: string, imagePath: string, user: RequestingUser) {
    await this.assertOwnedPartner(partnerId, user);

    return this.prisma.partnerPhoto.create({
      data: {
        partnerId,
        image: imagePath,
      },
    });
  }

  async removePhoto(partnerId: string, photoId: string, user: RequestingUser) {
    await this.assertOwnedPartner(partnerId, user);

    const photo = await this.prisma.partnerPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.partnerId !== partnerId) {
      throw new NotFoundException('Foto não encontrada ou não pertence a este parceiro.');
    }

    return this.prisma.partnerPhoto.delete({
      where: { id: photoId },
    });
  }

  private async assertOwnedPartner(partnerId: string, user: RequestingUser) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, createdById: true },
    });

    if (!partner) throw new NotFoundException('Parceiro não encontrado.');

    assertCanManagePartner(user, partner, 'Você não tem permissão para alterar este parceiro.');
    return partner;
  }
}
