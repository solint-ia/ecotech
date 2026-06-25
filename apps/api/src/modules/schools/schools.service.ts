import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.school.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
