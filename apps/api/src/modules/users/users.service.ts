import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: {
          select: {
            name: true,
            city: true,
            location: true,
            coverImage: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    
    if (result.role === 'SCHOOL_MANAGER' && result.school) {
      result.name = result.school.name;
      result.profileImage = (result.school as any).coverImage;
    }

    return result;
  }

  async updateMe(userId: string, data: any, filename?: string) {
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new NotFoundException('Usuário não encontrado.');

    if (currentUser.role === 'SCHOOL_MANAGER' && currentUser.schoolId) {
      const schoolUpdateData: any = {};
      if (data.name) schoolUpdateData.name = data.name;
      if (filename) schoolUpdateData.coverImage = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/uploads/${filename}`;
      
      await this.prisma.school.update({
        where: { id: currentUser.schoolId },
        data: schoolUpdateData,
      });

      const userUpdateData: any = {};
      if (data.email) userUpdateData.email = data.email;
      if (data.phone) userUpdateData.phone = data.phone;
      
      if (Object.keys(userUpdateData).length > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }
    } else {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.phone) updateData.phone = data.phone;
      if (filename) updateData.profileImage = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/uploads/${filename}`;
  
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return this.getMe(userId);
  }
}
