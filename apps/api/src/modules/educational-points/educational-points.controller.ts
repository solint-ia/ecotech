import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EducationalPointsService } from './educational-points.service';
import { CreateEducationalPointDto } from './dto/create-educational-point.dto';
import { UpdateEducationalPointDto } from './dto/update-educational-point.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

const storage = memoryStorage();

@Controller('educational-points')
export class EducationalPointsController {
  constructor(
    private readonly educationalPointsService: EducationalPointsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * GET /educational-points/trail/:trailId - All published points for a trail.
   * Optional auth: the QR code is only attached for the trail's owners.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('trail/:trailId')
  findByTrail(@Param('trailId') trailId: string, @CurrentUser() user?: any) {
    return this.educationalPointsService.findByTrail(trailId, false, user);
  }

  /** GET /educational-points/trail/:trailId/all - All points incl. unpublished (owners) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Get('trail/:trailId/all')
  findByTrailAdmin(@Param('trailId') trailId: string, @CurrentUser() user: any) {
    return this.educationalPointsService.findByTrail(trailId, true, user);
  }

  /**
   * GET /educational-points/:slug - Public detail view of a specific point.
   * Optional auth: the QR code is only attached for the trail's owners.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  findOne(@Param('slug') slug: string, @CurrentUser() user?: any) {
    return this.educationalPointsService.findBySlug(slug, user);
  }

  /** POST /educational-points - Create a new educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  async create(
    @Body() dto: CreateEducationalPointDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const file = files?.find(f => f.fieldname === 'mainImage');
    if (file) {
      dto.mainImage = await this.supabaseService.uploadFile(file, 'educational-points');
    }

    const educationalFile = files?.find(f => f.fieldname === 'educationalFile');

    return this.educationalPointsService.create(
      dto,
      { id: user.id, role: user.role, schoolId: user.schoolId },
      educationalFile,
    );
  }

  /** PATCH /educational-points/:id - Update an educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEducationalPointDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const file = files?.find(f => f.fieldname === 'mainImage');
    if (file) {
      dto.mainImage = await this.supabaseService.uploadFile(file, 'educational-points');
    }

    const educationalFile = files?.find(f => f.fieldname === 'educationalFile');

    return this.educationalPointsService.update(
      id,
      dto,
      { id: user.id, role: user.role, schoolId: user.schoolId },
      educationalFile,
    );
  }

  /** DELETE /educational-points/:id - Delete an educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.educationalPointsService.remove(id, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }
}
