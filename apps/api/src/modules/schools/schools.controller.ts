import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.schoolsService.findAllActive();
  }
}
