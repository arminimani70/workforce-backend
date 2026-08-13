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
import { SwapRequestsService } from './swap-requests.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts/swap-requests')
export class SwapRequestsController {
  constructor(private readonly swapRequestsService: SwapRequestsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSwapRequestDto,
  ) {
    return this.swapRequestsService.create(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.swapRequestsService.findMine(user.organizationId, user.userId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findPendingManager(@CurrentUser() user: AuthenticatedUser) {
    return this.swapRequestsService.findPendingManagerForOrg(
      user.organizationId,
    );
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.swapRequestsService.accept(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Patch(':id/decline')
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.swapRequestsService.decline(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.swapRequestsService.cancel(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.swapRequestsService.approve(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/deny')
  deny(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.swapRequestsService.deny(user.organizationId, id, user.userId);
  }
}
