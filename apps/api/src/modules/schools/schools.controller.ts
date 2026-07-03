import { Controller, Get, Param, Post, Query, UseGuards, Request, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(3600000)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 12;
    return this.schoolsService.findAllActive({ search, state, city, page: pageNumber, limit: limitNumber });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Request() req: any) {
    return this.schoolsService.getStatus(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  async toggleFollow(@Param('id') id: string, @Request() req: any) {
    return this.schoolsService.toggleFollow(id, req.user.id);
  }
}
