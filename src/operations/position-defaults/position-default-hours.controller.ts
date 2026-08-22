import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { PositionDefaultHoursService } from './position-default-hours.service';
import { UpsertPositionDefaultHoursDto } from './dto/upsert-position-default-hours.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('position-default-hours')
export class PositionDefaultHoursController {
  constructor(
    private readonly positionDefaultHoursService: PositionDefaultHoursService,
  ) {}

  // Any authenticated user — Availability needs these to prefill the time fields.
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.positionDefaultHoursService.listForOrg(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPositionDefaultHoursDto,
  ) {
    return this.positionDefaultHoursService.upsert(user.organizationId, dto);
  }
}
