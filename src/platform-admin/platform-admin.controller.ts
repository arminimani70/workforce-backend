import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminAuthGuard } from './guards/platform-admin-auth.guard';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminLoginDto } from './dto/platform-admin-login.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: PlatformAdminLoginDto) {
    return this.platformAdminService.login(dto);
  }

  @UseGuards(PlatformAdminAuthGuard)
  @Get('organizations')
  listOrganizations() {
    return this.platformAdminService.listOrganizations();
  }

  @UseGuards(PlatformAdminAuthGuard)
  @Patch('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.platformAdminService.updateOrganization(id, dto);
  }

  @UseGuards(PlatformAdminAuthGuard)
  @Get('plans')
  listPlans() {
    return this.platformAdminService.listPlans();
  }

  @UseGuards(PlatformAdminAuthGuard)
  @Patch('plans/:key')
  updatePlan(@Param('key') key: string, @Body() dto: UpdatePlanDto) {
    return this.platformAdminService.updatePlan(key, dto);
  }
}
