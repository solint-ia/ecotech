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
import { ApprovalStatus } from '@prisma/client';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

const storage = memoryStorage();

@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** GET /partners - Public list of approved partners with optional filters */
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    return this.partnersService.findAll(
      category,
      state,
      city,
      includeInactive === 'true',
      pageNumber,
      limitNumber,
      search,
    );
  }

  /**
   * GET /partners/admin/submissions - Moderation queue (ADMIN).
   * Declared before `:id` so that "admin" is not swallowed as a partner id.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/submissions')
  getSubmissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.getSubmissions({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      search,
    });
  }

  /** GET /partners/me - Partners registered by the current user */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Get('me')
  findMine(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.partnersService.findMine(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 12,
        status,
      },
    );
  }

  /**
   * GET /partners/:id - Detail view. Optional auth so that guests can read
   * approved partners while the author/admin can still open a pending one.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.partnersService.findOne(
      id,
      user && { id: user.id, role: user.role, schoolId: user.schoolId },
    );
  }

  /** POST /partners - Register a partner (ADMIN publishes; school/teacher submits) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createPartnerDto.coverImage = await this.supabaseService.uploadFile(file, 'partners');
    }
    return this.partnersService.create(createPartnerDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /partners/:id - Update partner (ADMIN or the user who registered it) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updatePartnerDto.coverImage = await this.supabaseService.uploadFile(file, 'partners');
    }
    return this.partnersService.update(id, updatePartnerDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** PATCH /partners/:id/status - Approve or reject a partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: ApprovalStatus) {
    if (!Object.values(ApprovalStatus).includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    return this.partnersService.updateStatus(id, status);
  }

  /** DELETE /partners/:id - Delete partner (ADMIN or the user who registered it) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.partnersService.remove(id, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** POST /partners/:id/photos - Add a photo to a partner */
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
    const imagePath = await this.supabaseService.uploadFile(file, 'partners/photos');
    return this.partnersService.addPhoto(id, imagePath, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  /** DELETE /partners/photos/:photoId - Delete a photo from a partner */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(
    @Param('photoId') photoId: string,
    @Query('partnerId') partnerId: string,
    @CurrentUser() user: any,
  ) {
    if (!partnerId) {
      throw new BadRequestException('partnerId is required');
    }
    return this.partnersService.removePhoto(partnerId, photoId, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }
}
