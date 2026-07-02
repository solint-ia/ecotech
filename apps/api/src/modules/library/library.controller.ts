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
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { LibraryService } from './library.service';
import { CreateLibraryContentDto } from './dto/create-library-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovalStatus } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

const storage = memoryStorage();

@Controller('library')
export class LibraryController {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(3600000)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.libraryService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      type,
      search,
      schoolId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/submissions')
  getSubmissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.libraryService.getSubmissions({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyMaterials(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.libraryService.findMyMaterials(
      { id: user.id, schoolId: user.schoolId },
      { 
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 12,
      }
    );
  }

  // Use Optional Guard so guests can view approved items, but authors/admins can view their pending items
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(3600000)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.libraryService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ], { storage }),
  )
  async create(
    @Body() createDto: CreateLibraryContentDto,
    @CurrentUser() user: any,
    @UploadedFiles() files: { coverImage?: Express.Multer.File[]; file?: Express.Multer.File[] },
  ) {
    if (files?.coverImage?.[0]) {
      createDto.coverImage = await this.supabaseService.uploadFile(files.coverImage[0], 'library');
    } else {
      throw new BadRequestException('Imagem de capa é obrigatória.');
    }

    if (files?.file?.[0]) {
      createDto.fileUrl = await this.supabaseService.uploadFile(files.file[0], 'library/files');
    }

    // validate logic: if it's a doc, requires file. if video, requires url.
    if (createDto.contentType === 'VIDEO' && !createDto.videoUrl) {
      throw new BadRequestException('Link do vídeo é obrigatório para conteúdos em vídeo.');
    }
    if (createDto.contentType !== 'VIDEO' && !createDto.fileUrl) {
      throw new BadRequestException('Arquivo é obrigatório para documentos.');
    }

    return this.libraryService.create(createDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER', 'TEACHER')
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ], { storage }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @CurrentUser() user: any,
    @UploadedFiles() files?: { coverImage?: Express.Multer.File[]; file?: Express.Multer.File[] },
  ) {
    if (files?.coverImage?.[0]) {
      updateDto.coverImage = await this.supabaseService.uploadFile(files.coverImage[0], 'library');
    }
    if (files?.file?.[0]) {
      updateDto.fileUrl = await this.supabaseService.uploadFile(files.file[0], 'library/files');
    }

    return this.libraryService.update(id, updateDto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ApprovalStatus,
  ) {
    if (!Object.values(ApprovalStatus).includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    return this.libraryService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.libraryService.remove(id, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }
}
