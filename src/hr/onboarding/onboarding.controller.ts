import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingGuideDto } from './dto/update-onboarding-guide.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getForOrg(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingGuideDto,
  ) {
    return this.onboardingService.update(
      user.organizationId,
      user.userId,
      dto.content,
    );
  }
}
