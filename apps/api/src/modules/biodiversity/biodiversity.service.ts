import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBiodiversityDto } from './dto/create-biodiversity.dto';
import { UpdateBiodiversityDto } from './dto/update-biodiversity.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BiodiversityService {
  constructor(private prisma: PrismaService) {}

  async findByTrail(trailId: string) {
    return this.prisma.biodiversityItem.findMany({
      where: { trailId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    dto: CreateBiodiversityDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    // Validate trail access
    const trail = await this.prisma.trail.findUnique({
      where: { id: dto.trailId },
      select: { id: true, schoolId: true },
    });

    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para adicionar itens a esta trilha.');
    }

    return this.prisma.biodiversityItem.create({
      data: {
        trailId: dto.trailId,
        groupType: dto.groupType,
        popularName: dto.popularName,
        scientificName: dto.scientificName ?? null,
        description: dto.description,
        image: dto.image ?? '',
        curiosities: dto.curiosities ?? null,
        environmentalImportance: dto.environmentalImportance,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateBiodiversityDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const item = await this.prisma.biodiversityItem.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true } } },
    });

    if (!item) throw new NotFoundException('Item de biodiversidade não encontrado.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && item.trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para editar este item.');
    }

    return this.prisma.biodiversityItem.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(
    id: string,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const item = await this.prisma.biodiversityItem.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true } } },
    });

    if (!item) throw new NotFoundException('Item de biodiversidade não encontrado.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && item.trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para excluir este item.');
    }

    // Clean up file if it exists
    if (item.image) {
      const imagePath = path.resolve(process.cwd(), item.image.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    return this.prisma.biodiversityItem.delete({ where: { id } });
  }
}
