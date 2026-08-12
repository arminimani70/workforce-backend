import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.getMine(user.organizationId, user.userId);
  }

  @Put('me')
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.upsertMine(
      user.organizationId,
      user.userId,
      dto.days,
    );
  }

  // Org-wide, for the week-builder screen to cross-reference who's available against what's
  // already scheduled.
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findAllForOrg(@CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.findAllForOrg(user.organizationId);
  }
}
