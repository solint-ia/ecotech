import { Controller, Get, Post, Patch, Delete, Body, UseGuards, UseInterceptors, UploadedFile, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAllForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      role,
    });
  }

  @Get('school/list')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_MANAGER')
  findAllForSchool(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    if (!user.schoolId) throw new Error('Usuário não possui escola vinculada.');
    return this.usersService.findAllForSchool({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      role,
      status,
      schoolId: user.schoolId,
    });
  }

  @Get('teacher/students')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  findStudentsForTeacher(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findStudentsForTeacher({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      teacherId: user.id,
    });
  }

  // --- Teacher self-service: manage own school links ---

  @Get('me/schools')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'USER')
  getMySchools(@CurrentUser() user: any) {
    return this.usersService.getMySchools(user.id);
  }

  @Post('me/schools')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'USER')
  addMySchool(@CurrentUser() user: any, @Body('schoolId') schoolId: string) {
    return this.usersService.addMySchool(user.id, schoolId);
  }

  @Delete('me/schools/:schoolId')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'USER')
  removeMySchool(@CurrentUser() user: any, @Param('schoolId') schoolId: string) {
    return this.usersService.removeMySchool(user.id, schoolId);
  }

  // --- Per-link teacher approval (ADMIN / SCHOOL_MANAGER) ---

  @Patch('teacher-links/:linkId/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  approveTeacherLink(@Param('linkId') linkId: string, @CurrentUser() user: any) {
    return this.usersService.approveTeacherLink(linkId, user);
  }

  @Patch('teacher-links/:linkId/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  rejectTeacherLink(@Param('linkId') linkId: string, @CurrentUser() user: any) {
    return this.usersService.rejectTeacherLink(linkId, user);
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  toggleUserStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.id);
  }

  @Get('pending')
  getPendingUsers(@CurrentUser() user: any) {
    return this.usersService.getPendingUsers(user);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  approveUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.approveUser(id, user);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  rejectUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.rejectUser(id, user);
  }

  @Patch(':id/unlink')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  unlinkUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.unlinkUser(id, user);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getMe(id);
  }

  @Patch('me')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return callback(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async updateMe(
    @CurrentUser() user: any,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let publicUrl: string | undefined;
    if (file) {
      publicUrl = await this.supabaseService.uploadFile(file, 'avatars');
    }
    return this.usersService.updateMe(user.id, updateData, publicUrl);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return callback(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let publicUrl: string | undefined;
    if (file) {
      publicUrl = await this.supabaseService.uploadFile(file, 'avatars');
    }
    return this.usersService.adminUpdateUser(id, updateData, publicUrl);
  }
}
