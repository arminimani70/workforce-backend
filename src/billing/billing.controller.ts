import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/schemas/user.schema';
import { BillingService } from './billing.service';
import type { LemonSqueezyWebhookPayload } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Public — the admin app's signup/upgrade page needs this before the user has a token.
  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('checkout')
  createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckout(
      user.organizationId,
      user.userId,
      dto.planId,
    );
  }

  // Lemon Squeezy calls this directly — no JWT, so verifySignature() is the only gate. Needs
  // the raw request body (see main.ts's rawBody: true) since the signature is computed over
  // the exact bytes sent, not the re-serialized parsed JSON.
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
  ) {
    this.billingService.verifySignature(req.rawBody!, signature);
    await this.billingService.handleWebhookEvent(
      req.body as LemonSqueezyWebhookPayload,
    );
    return { received: true };
  }
}
