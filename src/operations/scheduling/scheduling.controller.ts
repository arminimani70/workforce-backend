import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Owner/manager see their own pending/rejected ones too (so they can find and act on
    // them); a plain employee only ever sees shifts a manager has approved.
    const approvedOnly = user.role === UserRole.EMPLOYEE;
    return this.schedulingService.findForEmployee(
      user.organizationId,
      user.userId,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        approvedOnly,
      },
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.findAllForOrg(user.organizationId);
  }

  @Get('coworkers')
  findCoworkers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedulingService.findCoworkersInRange(
      user.organizationId,
      new Date(from),
      new Date(to),
    );
  }

  // Bulk-confirms every pending shift in the range — the "Publish Week" action after building
  // a week's schedule, so it becomes visible to employees all at once instead of shift by shift.
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch('publish')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedulingService.publishRange(
      user.organizationId,
      new Date(from),
      new Date(to),
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.schedulingService.confirm(user.organizationId, id);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.schedulingService.reject(user.organizationId, id);
  }
}
