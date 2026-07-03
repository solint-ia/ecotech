import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async updateMe(userId: string, data: any, publicUrl?: string) {
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new NotFoundException('Usuário não encontrado.');

    if (currentUser.role === 'SCHOOL_MANAGER' && currentUser.schoolId) {
      const schoolUpdateData: any = {};
      if (data.name) schoolUpdateData.name = data.name;
      if (publicUrl) schoolUpdateData.coverImage = publicUrl;
      
      await this.prisma.school.update({
        where: { id: currentUser.schoolId },
        data: schoolUpdateData,
      });

      const userUpdateData: any = {};
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
      if (data.phone) updateData.phone = data.phone;
      if (publicUrl) updateData.profileImage = publicUrl;
  
      if (data.schoolId !== undefined && data.schoolId !== currentUser.schoolId) {
        updateData.schoolId = data.schoolId || null;
        if (data.schoolId) {
          updateData.role = 'USER' as any;
          updateData.roleStatus = 'PENDENTE';
        } else {
          updateData.role = 'USER' as any;
          updateData.roleStatus = 'APROVADO';
        }
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return this.getMe(userId);
  }

  async getPendingUsers(currentUser: any) {
    if (currentUser.role === 'ADMIN') {
      const users = await this.prisma.user.findMany({
        where: { role: 'SCHOOL_MANAGER', roleStatus: { in: ['PENDENTE', 'REPROVADO'] } },
        include: { school: true },
        orderBy: { createdAt: 'desc' }
      });
      return users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
    }

    if (currentUser.role === 'SCHOOL_MANAGER' && currentUser.schoolId) {
      const users = await this.prisma.user.findMany({
        where: { 
          role: { in: ['TEACHER', 'USER' as any] },  
          roleStatus: { in: ['PENDENTE', 'REPROVADO'] }, 
          schoolId: currentUser.schoolId 
        },
        orderBy: { createdAt: 'desc' }
      });
      return users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
    }

    return [];
  }

  async approveUser(userId: string, currentUser?: any) {
    // If a SCHOOL_MANAGER is approving, the user becomes a TEACHER
    const newRole = currentUser?.role === 'SCHOOL_MANAGER' ? 'TEACHER' : undefined;
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: newRole ? { roleStatus: 'APROVADO', role: newRole } : { roleStatus: 'APROVADO' }
    });
    return { success: true, user: { id: user.id, roleStatus: user.roleStatus, role: user.role } };
  }

  async rejectUser(userId: string, currentUser?: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleStatus: 'REPROVADO' }
    });
    return { success: true, user: { id: user.id, roleStatus: user.roleStatus } };
  }

  async unlinkUser(userId: string, currentUser: any) {
    const userToUnlink = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userToUnlink) throw new NotFoundException('Usuário não encontrado.');
    
    // Ensure the school manager only unlinks users from their own school
    if (userToUnlink.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para desvincular este usuário.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { 
        schoolId: null, 
        role: 'USER' as any, 
        roleStatus: 'APROVADO' 
      }
    });

    return { success: true, user: { id: updatedUser.id, role: updatedUser.role } };
  }

  async findAllForAdmin(params: { page: number; limit: number; search?: string; role?: string }) {
    const { page, limit, search, role } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    // Não retornar o próprio ADMIN master se não quiser, mas vamos retornar todos.
    // where.role = { not: 'ADMIN' }; // opcional

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: { name: true, coverImage: true }
          }
        }
      }),
      this.prisma.user.count({ where }),
    ]);

    // Calcular stats gerais (independente de paginação e filtros de busca, apenas gerais ou baseados na query atual?)
    // O requisito pede Total, Ativos, Suspensos. Geralmente é o total do sistema.
    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: true } }),
      this.prisma.user.count({ where: { status: false } }),
    ]);

    return {
      data: users.map(user => {
        const { password, ...rest } = user;
        return rest;
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      }
    };
  }

  async findAllForSchool(params: { page: number; limit: number; search?: string; role?: string; status?: string; schoolId: string }) {
    const { page, limit, search, role, status, schoolId } = params;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status === 'true';
    }

    if (role && role !== 'ALL') {
      where.role = role;
    } else {
      where.role = { in: ['TEACHER', 'STUDENT'] };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where }),
    ]);

    const statRoles = (role && role !== 'ALL') ? [role] : ['TEACHER', 'STUDENT'];

    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any } } }),
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any }, status: true } }),
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any }, status: false } }),
    ]);

    return {
      data: users.map(user => {
        const { password, ...rest } = user;
        return rest;
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      }
    };
  }

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.role === 'ADMIN') {
      throw new Error('Não é possível alterar o status de um administrador principal.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: !user.status },
    });

    const { password, ...rest } = updatedUser;
    return rest;
  }
}
