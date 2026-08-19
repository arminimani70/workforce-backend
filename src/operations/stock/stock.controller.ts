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
import { StockService } from './stock.service';
import { UpsertStockTemplateDto } from './dto/upsert-stock-template.dto';
import { SubmitStockDto } from './dto/submit-stock.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put('templates')
  upsertTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertStockTemplateDto,
  ) {
    return this.stockService.upsertTemplate(user.organizationId, dto);
  }

  // Any authenticated user — the catalog to pick a stock list from.
  @Get('templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.stockService.listTemplates(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('templates/:id')
  deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.stockService.deleteTemplate(user.organizationId, id);
  }

  @Post('submissions')
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitStockDto) {
    return this.stockService.submit(user.organizationId, user.userId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get('submissions')
  listSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.stockService.listSubmissions(user.organizationId);
  }
}
