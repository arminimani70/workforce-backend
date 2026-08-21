import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminAuthGuard } from './guards/platform-admin-auth.guard';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminLoginDto } from './dto/platform-admin-login.dto';

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
}
