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
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /** GET /partners - Public list of partners with optional category filter */
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('state') state?: string,
    @Query('city') city?: string
  ) {
    return this.partnersService.findAll(category, state, city);
  }

  /** GET /partners/:id - Public detail view of a specific partner */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  /** POST /partners - Create new partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  create(
    @Body() createPartnerDto: CreatePartnerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createPartnerDto.coverImage = `/uploads/${file.filename}`;
    }
    return this.partnersService.create(createPartnerDto);
  }

  /** PATCH /partners/:id - Update partner (ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage', { storage }))
  update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updatePartnerDto.coverImage = `/uploads/${file.filename}`;
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
  @UseInterceptors(FileInterceptor('image', { storage }))
  async addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Imagem não fornecida');
    }
    const imagePath = `/uploads/${file.filename}`;
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
