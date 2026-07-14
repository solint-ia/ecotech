import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TrailsService } from './trails.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateApprovalDto } from '../../common/dto/update-approval.dto';

const storage = memoryStorage();

@Controller('trails')
export class TrailsController {
  constructor(
    private readonly trailsService: TrailsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** GET /trails - Public list of published trails with filters */
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('biome') biome?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    return this.trailsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      state,
      city,
      biome,
      difficulty,
      search,
    });
  }

  /** GET /trails/biomes - List of distinct biomes (for filter dropdown) */
  @Get('biomes')
  getBiomes() {
    return this.trailsService.getBiomes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Get('my-drafts')
  findMyDrafts(@CurrentUser() user: any) {
    return this.trailsService.findDrafts(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Get('my-trails')
  findMyTrails(@CurrentUser() user: any) {
    return this.trailsService.findMyTrails(user.id);
  }

  /** GET /trails/saved - Trails saved by the current user */
  @UseGuards(JwtAuthGuard)
  @Get('saved')
  findSaved(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trailsService.findSaved(user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
  }

  /** GET /trails/admin - All trails (admin/school view, requires auth) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Get('admin')
  findAllForAdmin(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const schoolId = user.role === 'SCHOOL_MANAGER' ? user.schoolId : undefined;
    return this.trailsService.findAllForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      schoolId,
    });
  }

  /** GET /trails/admin/submissions - Trails awaiting moderation (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/submissions')
  getSubmissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.trailsService.getSubmissions({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
  }

  /** GET /trails/:slug - Public details of a published trail */
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.trailsService.findBySlug(slug);
  }

  /** POST /trails - Create new trail (ADMIN, SCHOOL_MANAGER or TEACHER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async create(
    @Body() createTrailDto: CreateTrailDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createTrailDto.coverImage = await this.supabaseService.uploadFile(file, 'trails');
    }
    return this.trailsService.create(createTrailDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /trails/:id - Update trail (ADMIN, SCHOOL_MANAGER or TEACHER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async update(
    @Param('id') id: string,
    @Body() updateTrailDto: UpdateTrailDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateTrailDto.coverImage = await this.supabaseService.uploadFile(file, 'trails');
    }
    return this.trailsService.update(id, updateTrailDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /trails/:id/approval - Approve or reject a trail (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approval')
  updateApproval(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalDto,
  ) {
    return this.trailsService.updateApprovalStatus(id, dto.status, dto.reason);
  }

  /** DELETE /trails/:id - Delete trail (ADMIN, owning SCHOOL_MANAGER or authoring TEACHER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trailsService.remove(id, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** POST /trails/:id/like - Toggle like on a trail */
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trailsService.toggleLike(id, user.id);
  }

  /** POST /trails/:id/save - Toggle save on a trail */
  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  toggleSave(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trailsService.toggleSave(id, user.id);
  }

  /** GET /trails/:id/status - Get current user's interaction status with trail */
  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  getStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trailsService.getStatus(id, user.id);
  }

  /** POST /trails/:id/photos - Add a photo to a trail */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Post(':id/photos')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image', { storage }))
  async addPhoto(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Imagem não fornecida');
    }
    const imagePath = await this.supabaseService.uploadFile(file, 'trails/photos');
    return this.trailsService.addPhoto(id, imagePath, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** DELETE /trails/photos/:photoId - Delete a photo from a trail */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhoto(@Param('photoId') photoId: string, @CurrentUser() user: any) {
    const deletedPhoto = await this.trailsService.removePhoto(photoId, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    if (deletedPhoto?.image) {
      await this.supabaseService.deleteFile(deletedPhoto.image).catch(e => 
        console.error('Falha ao excluir arquivo do Supabase:', e)
      );
    }
    
    return deletedPhoto;
  }
}
