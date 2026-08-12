import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { SchedulingService } from './scheduling.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShiftDto) {
    return this.schedulingService.create(user.organizationId, user.userId, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.findForEmployee(
      user.organizationId,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.findAllForOrg(user.organizationId);
  }
}
