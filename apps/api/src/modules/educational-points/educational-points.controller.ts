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
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EducationalPointsService } from './educational-points.service';
import { CreateEducationalPointDto } from './dto/create-educational-point.dto';
import { UpdateEducationalPointDto } from './dto/update-educational-point.dto';
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

@Controller('educational-points')
export class EducationalPointsController {
  constructor(private readonly educationalPointsService: EducationalPointsService) {}

  /** GET /educational-points/trail/:trailId - All points for a trail */
  @Get('trail/:trailId')
  findByTrail(@Param('trailId') trailId: string) {
    return this.educationalPointsService.findByTrail(trailId, false);
  }

  /** GET /educational-points/trail/:trailId/all - All points incl. unpublished (admin) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Get('trail/:trailId/all')
  findByTrailAdmin(@Param('trailId') trailId: string) {
    return this.educationalPointsService.findByTrail(trailId, true);
  }

  /** GET /educational-points/:slug - Public detail view of a specific point */
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.educationalPointsService.findBySlug(slug);
  }

  /** POST /educational-points - Create a new educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  create(
    @Body() dto: CreateEducationalPointDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    console.log('DTO RECEIVED:', dto);
    console.log('FILES RECEIVED:', files);
    const file = files?.find(f => f.fieldname === 'mainImage');
    if (file) {
      dto.mainImage = `/uploads/${file.filename}`;
    }
    return this.educationalPointsService.create(dto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /educational-points/:id - Update an educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEducationalPointDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const file = files?.find(f => f.fieldname === 'mainImage');
    if (file) {
      dto.mainImage = `/uploads/${file.filename}`;
    }
    return this.educationalPointsService.update(id, dto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** DELETE /educational-points/:id - Delete an educational point */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
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
