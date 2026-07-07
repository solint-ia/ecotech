import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { validateOpeningHours } from './opening-hours.util';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPartnerDto: CreatePartnerDto) {
    validateOpeningHours(createPartnerDto.openingHours);

    return this.prisma.partner.create({
      data: {
        ...createPartnerDto,
        coverImage: createPartnerDto.coverImage || '',
        openingHours: createPartnerDto.openingHours as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(category?: string, state?: string, city?: string, includeInactive?: boolean, page = 1, limit = 20, search?: string) {
    const where: any = {
      ...(includeInactive ? {} : { status: true }),
      ...(category && { category }),
      ...(state && { state }),
      ...(city && { city }),
    };

    if (search) {
      // Search by partner name only.
      where.name = { contains: search, mode: 'insensitive' };
    }

    const totalCount = await this.prisma.partner.count({ where });

    const data = await this.prisma.partner.findMany({
      where,
      include: {
        photos: true,
      },
      orderBy: {
        name: 'asc',
      },
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

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        photos: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto) {
    await this.findOne(id); // Check existence

    if (updatePartnerDto.openingHours) {
      validateOpeningHours(updatePartnerDto.openingHours);
    }

    return this.prisma.partner.update({
      where: { id },
      data: {
        ...updatePartnerDto,
        openingHours: updatePartnerDto.openingHours as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.partner.delete({
      where: { id },
    });
  }

  async addPhoto(partnerId: string, imagePath: string) {
    await this.findOne(partnerId);

    return this.prisma.partnerPhoto.create({
      data: {
        partnerId,
        image: imagePath,
      },
    });
  }

  async removePhoto(partnerId: string, photoId: string) {
    await this.findOne(partnerId);
    
    const photo = await this.prisma.partnerPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.partnerId !== partnerId) {
      throw new NotFoundException('Photo not found or does not belong to this partner');
    }

    return this.prisma.partnerPhoto.delete({
      where: { id: photoId },
    });
  }
}
