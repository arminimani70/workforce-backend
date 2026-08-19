import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
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
import { ResolveChecklistDto } from './dto/resolve-checklist.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

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

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('submissions')
  findSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.checklistsService.findSubmissions(user.organizationId);
  }

  @Get('today')
  getToday(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ResolveChecklistDto,
  ) {
    return this.checklistsService.getToday(
      user.organizationId,
      user.userId,
      dto.position,
      dto.jobSite?.trim() ?? '',
    );
  }

  @Patch('today/opening')
  updateOpening(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(
      user.organizationId,
      user.userId,
      dto.position,
      dto.jobSite?.trim() ?? '',
      'opening',
      dto.item,
      dto.done,
    );
  }

  @Patch('today/closing')
  updateClosing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(
      user.organizationId,
      user.userId,
      dto.position,
      dto.jobSite?.trim() ?? '',
      'closing',
      dto.item,
      dto.done,
    );
  }

  @Patch('today/opening/submit')
  submitOpening(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveChecklistDto,
  ) {
    return this.checklistsService.submitSection(
      user.organizationId,
      user.userId,
      dto.position,
      dto.jobSite?.trim() ?? '',
      'opening',
    );
  }

  @Patch('today/closing/submit')
  submitClosing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveChecklistDto,
  ) {
    return this.checklistsService.submitSection(
      user.organizationId,
      user.userId,
      dto.position,
      dto.jobSite?.trim() ?? '',
      'closing',
    );
  }
}
