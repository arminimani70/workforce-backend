import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { WastageService } from './wastage.service';
import { UpsertWastageReasonDto } from './dto/upsert-wastage-reason.dto';
import { CreateWastageEntryDto } from './dto/create-wastage-entry.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wastage')
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put('reasons')
  upsertReason(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertWastageReasonDto,
  ) {
    return this.wastageService.upsertReason(user.organizationId, dto);
  }

  // Any authenticated user — populates the reason picker on the submission form.
  @Get('reasons')
  listReasons(@CurrentUser() user: AuthenticatedUser) {
    return this.wastageService.listReasons(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('reasons/:id')
  deleteReason(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.wastageService.deleteReason(user.organizationId, id);
  }

  @Post('entries')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWastageEntryDto,
  ) {
    return this.wastageService.create(user.organizationId, user.userId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('entries')
  listEntries(@CurrentUser() user: AuthenticatedUser) {
    return this.wastageService.listEntries(user.organizationId);
  }
}
