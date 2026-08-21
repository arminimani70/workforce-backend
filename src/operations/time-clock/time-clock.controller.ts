import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { TimeClockService } from './time-clock.service';
import { ClockLocationDto } from './dto/clock-location.dto';
import { ClockInDto } from './dto/clock-in.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-clock')
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @Post('clock-in')
  clockIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClockInDto) {
    return this.timeClockService.clockIn(user.organizationId, user.userId, dto);
  }

  @Post('clock-out')
  clockOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() location: ClockLocationDto,
  ) {
    return this.timeClockService.clockOut(
      user.organizationId,
      user.userId,
      location,
    );
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.timeClockService.getStatus(user.organizationId, user.userId);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.timeClockService.getHistory(
      user.organizationId,
      user.userId,
      limit ? Number(limit) : undefined,
    );
  }

  // Owner/manager only — the admin panel's attendance report, every employee at once.
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('entries')
  getAllEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeClockService.findAllInOrg(
      user.organizationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('total')
  getTotal(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeClockService.getTotalDuration(
      user.organizationId,
      user.userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
