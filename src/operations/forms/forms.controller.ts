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
import { FormsService } from './forms.service';
import { UpsertFormTemplateDto } from './dto/upsert-form-template.dto';
import { SubmitFormDto } from './dto/submit-form.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put('templates')
  upsertTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertFormTemplateDto,
  ) {
    return this.formsService.upsertTemplate(user.organizationId, dto);
  }

  // Any authenticated user — the catalog to pick a form from.
  @Get('templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.formsService.listTemplates(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('templates/:id')
  deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.formsService.deleteTemplate(user.organizationId, id);
  }

  @Post('submissions')
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitFormDto) {
    return this.formsService.submit(user.organizationId, user.userId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('submissions')
  listSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.formsService.listSubmissions(user.organizationId);
  }
}
