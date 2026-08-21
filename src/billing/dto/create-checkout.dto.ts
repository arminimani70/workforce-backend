import { IsNotEmpty, IsString } from 'class-validator';

// Plans are DB-backed now (see PlansService) so the valid set can't be checked statically at
// decorator-eval time — BillingService.createCheckout throws BadRequestException for an
// unknown key instead.
export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}
