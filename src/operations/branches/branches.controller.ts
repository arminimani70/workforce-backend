import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { BranchesService } from './branches.service';
import { UpsertBranchDto } from './dto/upsert-branch.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put()
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertBranchDto) {
    return this.branchesService.upsert(user.organizationId, dto);
  }

  // Any authenticated user — used to populate branch pickers (New Shift, checklists) and to
  // resolve the geofence circle for the clock-in map.
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.branchesService.list(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branchesService.delete(user.organizationId, id);
  }
}
