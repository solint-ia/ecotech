import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.id);
  }

  @Get('pending')
  getPendingUsers(@CurrentUser() user: any) {
    return this.usersService.getPendingUsers(user);
  }

  @Patch(':id/approve')
  approveUser(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Patch(':id/reject')
  rejectUser(@Param('id') id: string) {
    return this.usersService.rejectUser(id);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getMe(id);
  }

  @Patch('me')
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
}
