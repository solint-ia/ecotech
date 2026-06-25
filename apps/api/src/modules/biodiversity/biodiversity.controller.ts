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
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BiodiversityService } from './biodiversity.service';
import { CreateBiodiversityDto } from './dto/create-biodiversity.dto';
import { UpdateBiodiversityDto } from './dto/update-biodiversity.dto';
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

@Controller('biodiversity')
export class BiodiversityController {
  constructor(private readonly biodiversityService: BiodiversityService) {}

  @Get('trail/:trailId')
  findByTrail(@Param('trailId') trailId: string) {
    return this.biodiversityService.findByTrail(trailId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  create(
    @Body() dto: CreateBiodiversityDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const file = files?.find(f => f.fieldname === 'image');
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.biodiversityService.create(dto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor({ storage }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBiodiversityDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const file = files?.find(f => f.fieldname === 'image');
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.biodiversityService.update(id, dto, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SCHOOL_MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.biodiversityService.remove(id, {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });
  }
}
