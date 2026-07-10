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
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseService } from '../supabase/supabase.service';

const storage = memoryStorage();

@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** GET /partners - Public list of partners with optional category filter */
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(3600000)
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
    return this.partnersService.findAll(category, state, city, includeInactive === 'true', pageNumber, limitNumber, search);
  }

  /** GET /partners/:id - Public detail view of a specific partner */
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(3600000)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  /** POST /partners - Create new partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createPartnerDto.coverImage = await this.supabaseService.uploadFile(file, 'partners');
    }
    return this.partnersService.create(createPartnerDto);
  }

  /** PATCH /partners/:id - Update partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  async update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updatePartnerDto.coverImage = await this.supabaseService.uploadFile(file, 'partners');
    }
    return this.partnersService.update(id, updatePartnerDto);
  }

  /** DELETE /partners/:id - Delete partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }

  /** POST /partners/:id/photos - Add a photo to a partner */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/photos')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image', { storage }))
  async addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Imagem não fornecida');
    }
    const imagePath = await this.supabaseService.uploadFile(file, 'partners/photos');
    return this.partnersService.addPhoto(id, imagePath);
  }

  /** DELETE /partners/photos/:photoId - Delete a photo from a partner */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(
    @Param('photoId') photoId: string,
    @Query('partnerId') partnerId: string,
  ) {
    if (!partnerId) {
      throw new BadRequestException('partnerId is required');
    }
    return this.partnersService.removePhoto(partnerId, photoId);
  }
}
