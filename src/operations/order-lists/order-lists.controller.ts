import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { OrderListsService } from './order-lists.service';
import { UpsertOrderListTemplateDto } from './dto/upsert-order-list-template.dto';
import { SubmitOrderListDto } from './dto/submit-order-list.dto';
import { UpdateOrderSubmissionDto } from './dto/update-order-submission.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('order-lists')
export class OrderListsController {
  constructor(private readonly orderListsService: OrderListsService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put('templates')
  upsertTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertOrderListTemplateDto,
  ) {
    return this.orderListsService.upsertTemplate(user.organizationId, dto);
  }

  // Any authenticated user — the catalog to pick an order list from.
  @Get('templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.orderListsService.listTemplates(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('templates/:id')
  deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.orderListsService.deleteTemplate(user.organizationId, id);
  }

  @Post('submissions')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitOrderListDto,
  ) {
    return this.orderListsService.submit(user.organizationId, user.userId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('submissions')
  listSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.orderListsService.listSubmissions(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch('submissions/:id')
  updateSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderSubmissionDto,
  ) {
    return this.orderListsService.updateSubmission(
      user.organizationId,
      id,
      dto.quantities,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('submissions/:id')
  deleteSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.orderListsService.deleteSubmission(user.organizationId, id);
  }
}
