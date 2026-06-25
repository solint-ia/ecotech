import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEducationalPointDto } from './dto/create-educational-point.dto';
import { UpdateEducationalPointDto } from './dto/update-educational-point.dto';

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
export class EducationalPointsService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const point = await this.prisma.educationalPoint.findFirst({
      where: { slug, status: true, trail: { status: true } },
      include: {
        trail: {
          select: {
            title: true,
            wikilocUrl: true,
            school: { select: { name: true } },
          },
        },
        qrCodes: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!point) {
      throw new NotFoundException('Ponto educativo não encontrado.');
    }

    return point;
  }

  async findByTrail(trailId: string, includeUnpublished = false) {
    return this.prisma.educationalPoint.findMany({
      where: {
        trailId,
        ...(includeUnpublished ? {} : { status: true }),
      },
      orderBy: { order: 'asc' },
    });
  }

  async create(
    dto: CreateEducationalPointDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    // Validate trail access
    const trail = await this.prisma.trail.findUnique({
      where: { id: dto.trailId },
      select: { id: true, schoolId: true },
    });

    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para adicionar pontos a esta trilha.');
    }

    // Generate unique slug
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.prisma.educationalPoint.findFirst({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    return this.prisma.educationalPoint.create({
      data: {
        trailId: dto.trailId,
        title: dto.title,
        slug,
        type: dto.type as any,
        order: dto.order,
        shortDescription: dto.shortDescription ?? '',
        fullDescription: dto.fullDescription ?? '',
        curiosities: dto.curiosities,
        environmentalImportance: dto.environmentalImportance ?? '',
        preservationCare: dto.preservationCare ?? '',
        mainImage: dto.mainImage ?? '',
        offlineSummary: dto.offlineSummary ?? '',
        status: dto.status ?? false,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateEducationalPointDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const point = await this.prisma.educationalPoint.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true } } },
    });

    if (!point) throw new NotFoundException('Ponto educativo não encontrado.');

    if (
      requestingUser.role === 'SCHOOL_MANAGER' &&
      point.trail.schoolId !== requestingUser.schoolId
    ) {
      throw new ForbiddenException('Você não tem permissão para editar este ponto.');
    }

    return this.prisma.educationalPoint.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.type && { type: dto.type as any }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription }),
        ...(dto.curiosities !== undefined && { curiosities: dto.curiosities }),
        ...(dto.environmentalImportance !== undefined && {
          environmentalImportance: dto.environmentalImportance,
        }),
        ...(dto.preservationCare !== undefined && { preservationCare: dto.preservationCare }),
        ...(dto.mainImage !== undefined && { mainImage: dto.mainImage }),
        ...(dto.offlineSummary !== undefined && { offlineSummary: dto.offlineSummary }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(
    id: string,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const point = await this.prisma.educationalPoint.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true } } },
    });

    if (!point) throw new NotFoundException('Ponto educativo não encontrado.');

    if (
      requestingUser.role === 'SCHOOL_MANAGER' &&
      point.trail.schoolId !== requestingUser.schoolId
    ) {
      throw new ForbiddenException('Você não tem permissão para excluir este ponto.');
    }

    return this.prisma.educationalPoint.delete({ where: { id } });
  }
}
