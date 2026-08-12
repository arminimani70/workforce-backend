import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { TimeClockService } from './time-clock.service';
import { ClockLocationDto } from './dto/clock-location.dto';

@UseGuards(JwtAuthGuard)
@Controller('time-clock')
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @Post('clock-in')
  clockIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() location: ClockLocationDto,
  ) {
    return this.timeClockService.clockIn(
      user.organizationId,
      user.userId,
      location,
    );
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
}
