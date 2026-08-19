import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { ShiftEditRequestsService } from './shift-edit-requests.service';
import { CreateShiftEditRequestDto } from './dto/create-shift-edit-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts/edit-requests')
export class ShiftEditRequestsController {
  constructor(
    private readonly shiftEditRequestsService: ShiftEditRequestsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShiftEditRequestDto,
  ) {
    return this.shiftEditRequestsService.create(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.shiftEditRequestsService.findMine(
      user.organizationId,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findPending(@CurrentUser() user: AuthenticatedUser) {
    return this.shiftEditRequestsService.findPendingForOrg(user.organizationId);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shiftEditRequestsService.cancel(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shiftEditRequestsService.approve(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shiftEditRequestsService.reject(
      user.organizationId,
      id,
      user.userId,
    );
  }
}
