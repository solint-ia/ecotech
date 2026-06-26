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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrailsService } from './trails.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  /** GET /trails - Public list of published trails with filters */
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('biome') biome?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    return this.trailsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
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
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Get('my-drafts')
  findMyDrafts(@CurrentUser() user: any) {
    const schoolId = user.role === 'SCHOOL_MANAGER' ? user.schoolId : undefined;
    return this.trailsService.findDrafts(schoolId);
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

  /** GET /trails/:slug - Public detail view of a specific trail */
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.trailsService.findBySlug(slug);
  }

  /** POST /trails - Create new trail (ADMIN or SCHOOL_MANAGER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  create(
    @Body() createTrailDto: CreateTrailDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createTrailDto.coverImage = `/uploads/${file.filename}`;
    }
    return this.trailsService.create(createTrailDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /trails/:id - Update trail (ADMIN or owning SCHOOL_MANAGER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  update(
    @Param('id') id: string,
    @Body() updateTrailDto: UpdateTrailDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateTrailDto.coverImage = `/uploads/${file.filename}`;
    }
    return this.trailsService.update(id, updateTrailDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** DELETE /trails/:id - Delete trail (ADMIN or owning SCHOOL_MANAGER) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
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
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('image', { storage }))
  async addPhoto(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Imagem não fornecida');
    }
    const imagePath = `/uploads/${file.filename}`;
    return this.trailsService.addPhoto(id, imagePath, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** DELETE /trails/photos/:photoId - Delete a photo from a trail */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('photoId') photoId: string, @CurrentUser() user: any) {
    return this.trailsService.removePhoto(photoId, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }
}
