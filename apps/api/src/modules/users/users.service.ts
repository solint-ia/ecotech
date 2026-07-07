import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
            type: true,
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

    // Phone must stay unique across users (same rule enforced at registration).
    if (data.phone && data.phone !== currentUser.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: data.phone, NOT: { id: userId } },
      });
      if (existingPhone) throw new ConflictException('Este telefone já está em uso.');
    }

    if (currentUser.role === 'SCHOOL_MANAGER' && currentUser.schoolId) {
      const schoolUpdateData: any = {};
      if (data.name) schoolUpdateData.name = data.name;
      if (data.schoolType) schoolUpdateData.type = data.schoolType;
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
        // Changing the school link resets approval: the new school must approve
        // the user again. Linking to a school -> PENDENTE; unlinking -> APROVADO.
        if (currentUser.role === 'TEACHER') {
          updateData.role = 'USER' as any;
          updateData.roleStatus = data.schoolId ? 'PENDENTE' : 'APROVADO';
        } else if (currentUser.role === 'STUDENT') {
          // A student that changes/links a school goes back to pending approval.
          updateData.roleStatus = data.schoolId ? 'PENDENTE' : 'APROVADO';
        } else if (
          currentUser.role === 'USER' &&
          currentUser.roleStatus !== 'PENDENTE' &&
          data.schoolId
        ) {
          // A plain user (e.g. a student who was previously unlinked from a
          // school) that links to a school again becomes a student awaiting
          // approval. Pending teachers awaiting approval are left untouched.
          updateData.role = 'STUDENT' as any;
          updateData.roleStatus = 'PENDENTE';
        }
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return this.getMe(userId);
  }

  async adminUpdateUser(targetUserId: string, data: any, publicUrl?: string) {
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Usuário não encontrado.');

    if (data.email && data.email !== targetUser.email) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) throw new ForbiddenException('Este e-mail já está em uso.');
    }

    // Phone must stay unique across users (same rule enforced at registration).
    if (data.phone && data.phone !== targetUser.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: data.phone, NOT: { id: targetUserId } },
      });
      if (existingPhone) throw new ConflictException('Este telefone já está em uso.');
    }

    // Admins can set a new password directly, without the current password.
    let hashedPassword: string | undefined;
    if (data.password) {
      if (String(data.password).length < 6) {
        throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
      }
      hashedPassword = await bcrypt.hash(String(data.password), 10);
    }

    if (targetUser.role === 'SCHOOL_MANAGER' && targetUser.schoolId) {
      const schoolUpdateData: any = {};
      if (data.name) schoolUpdateData.name = data.name;
      if (data.schoolType) schoolUpdateData.type = data.schoolType;
      if (publicUrl) schoolUpdateData.coverImage = publicUrl;

      if (Object.keys(schoolUpdateData).length > 0) {
        await this.prisma.school.update({
          where: { id: targetUser.schoolId },
          data: schoolUpdateData,
        });
      }

      const userUpdateData: any = {};
      if (data.phone) userUpdateData.phone = data.phone;
      if (data.email) userUpdateData.email = data.email;
      if (hashedPassword) userUpdateData.password = hashedPassword;

      if (Object.keys(userUpdateData).length > 0) {
        await this.prisma.user.update({
          where: { id: targetUserId },
          data: userUpdateData,
        });
      }
    } else {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.phone) updateData.phone = data.phone;
      if (data.email) updateData.email = data.email;
      if (publicUrl) updateData.profileImage = publicUrl;
      if (hashedPassword) updateData.password = hashedPassword;

      if (data.schoolId !== undefined && data.schoolId !== targetUser.schoolId) {
        updateData.schoolId = data.schoolId || null;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: targetUserId },
          data: updateData,
        });
      }
    }

    return this.getMe(targetUserId);
  }

  /**
   * Authorization for approve/reject/unlink actions over a target user.
   * - ADMIN: any user.
   * - SCHOOL_MANAGER: any non-manager user of their own school (teachers + students).
   * - TEACHER: only students of their own school.
   */
  private assertCanManage(currentUser: any, target: { role: string; schoolId: string | null }) {
    if (currentUser.role === 'ADMIN') return;

    if (!currentUser.schoolId || target.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este usuário.');
    }

    if (currentUser.role === 'TEACHER') {
      // A pending student keeps role STUDENT while awaiting approval.
      if (target.role !== 'STUDENT') {
        throw new ForbiddenException('Professores só podem gerenciar estudantes da própria escola.');
      }
      return;
    }

    if (currentUser.role === 'SCHOOL_MANAGER') {
      if (target.role === 'SCHOOL_MANAGER') {
        throw new ForbiddenException('Você não tem permissão para gerenciar este usuário.');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar este usuário.');
  }

  async getPendingUsers(currentUser: any) {
    const strip = (users: any[]) => users.map(({ password, ...rest }) => rest);

    if (currentUser.role === 'ADMIN') {
      // Admins see pending school registrations (SCHOOL_MANAGER), pending
      // teachers (stored as role USER while awaiting approval) and pending
      // students, across every school.
      const users = await this.prisma.user.findMany({
        where: {
          roleStatus: { in: ['PENDENTE', 'REPROVADO'] },
          OR: [
            { role: 'SCHOOL_MANAGER' },
            { role: { in: ['TEACHER', 'USER', 'STUDENT'] as any }, schoolId: { not: null } },
          ],
        },
        include: { school: true },
        orderBy: { createdAt: 'desc' },
      });
      return strip(users);
    }

    if (currentUser.role === 'SCHOOL_MANAGER' && currentUser.schoolId) {
      // Managers see pending teachers and students of their own school.
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: ['TEACHER', 'USER', 'STUDENT'] as any },
          roleStatus: { in: ['PENDENTE', 'REPROVADO'] },
          schoolId: currentUser.schoolId,
        },
        include: { school: true },
        orderBy: { createdAt: 'desc' },
      });
      return strip(users);
    }

    if (currentUser.role === 'TEACHER' && currentUser.schoolId) {
      // Teachers only see pending students of their own school.
      const users = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT' as any,
          roleStatus: { in: ['PENDENTE', 'REPROVADO'] },
          schoolId: currentUser.schoolId,
        },
        include: { school: true },
        orderBy: { createdAt: 'desc' },
      });
      return strip(users);
    }

    return [];
  }

  async approveUser(userId: string, currentUser?: any) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    if (currentUser) this.assertCanManage(currentUser, target);

    // A pending teacher is stored with role USER while awaiting approval;
    // approving promotes them to TEACHER. Students keep their STUDENT role and
    // school managers keep their role.
    const data: any = { roleStatus: 'APROVADO' };
    if (target.role === 'USER' && target.schoolId) {
      data.role = 'TEACHER';
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return { success: true, user: { id: user.id, roleStatus: user.roleStatus, role: user.role } };
  }

  async rejectUser(userId: string, currentUser?: any) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    if (currentUser) this.assertCanManage(currentUser, target);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleStatus: 'REPROVADO' }
    });
    return { success: true, user: { id: user.id, roleStatus: user.roleStatus } };
  }

  async unlinkUser(userId: string, currentUser: any) {
    const userToUnlink = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userToUnlink) throw new NotFoundException('Usuário não encontrado.');

    // Same scoping as approve/reject: teachers unlink only their students,
    // managers unlink non-managers of their school, admins unlink anyone.
    this.assertCanManage(currentUser, userToUnlink);

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
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
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

    const [totalUsers, activeUsers, suspendedUsers, pendingUsers] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any } } }),
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any }, status: true } }),
      this.prisma.user.count({ where: { schoolId, role: { in: statRoles as any }, status: false } }),
      this.prisma.user.count({
        where: {
          schoolId,
          roleStatus: 'PENDENTE',
          role: { in: ['TEACHER', 'USER' as any] }
        }
      }),
    ]);

    return {
      data: users.map(user => {
        const { password, ...rest } = user;
        return rest;
      }),
      meta: {
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
      stats: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        pending: pendingUsers,
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
