import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { ChecklistsService } from './checklists.service';
import { UpsertChecklistTemplateDto } from './dto/upsert-checklist-template.dto';
import { UpdateCompletionDto } from './dto/update-completion.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put('templates')
  upsertTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertChecklistTemplateDto,
  ) {
    return this.checklistsService.upsertTemplate(user.organizationId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('templates')
  findAllTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.checklistsService.findAllTemplates(user.organizationId);
  }

  @Get('shift/:shiftId')
  getShiftChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ) {
    return this.checklistsService.getShiftChecklist(
      user.organizationId,
      user.userId,
      user.role,
      shiftId,
    );
  }

  @Patch('shift/:shiftId/opening')
  updateOpening(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Body() dto: UpdateCompletionDto,
  ) {
    return this.checklistsService.updateCompletion(
      user.organizationId,
      user.userId,
      shiftId,
      'opening',
      dto.item,
      dto.done,
    );
  }

  @Patch('shift/:shiftId/closing')
  updateClosing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Body() dto: UpdateCompletionDto,
  ) {
    return this.checklistsService.updateCompletion(
      user.organizationId,
      user.userId,
      shiftId,
      'closing',
      dto.item,
      dto.done,
    );
  }
}
