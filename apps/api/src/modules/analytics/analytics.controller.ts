import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles('ADMIN')
  @Get('admin')
  getAdminDashboard() {
    return this.analyticsService.getAdminMetrics();
  }

  @Roles('SCHOOL_MANAGER')
  @Get('school')
  getSchoolDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getSchoolMetrics(user.schoolId);
  }

  @Roles('TEACHER')
  @Get('teacher')
  getTeacherDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getTeacherMetrics(user.id);
  }
}
