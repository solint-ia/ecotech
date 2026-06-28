import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPartnerDto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: {
        ...createPartnerDto,
        coverImage: createPartnerDto.coverImage || '',
      },
    });
  }

  async findAll(category?: string, state?: string, city?: string) {
    return this.prisma.partner.findMany({
      where: {
        status: true,
        ...(category && { category }),
        ...(state && { state }),
        ...(city && { city }),
      },
      include: {
        photos: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
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

    return this.prisma.partner.update({
      where: { id },
      data: updatePartnerDto,
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
