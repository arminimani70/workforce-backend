import { IsIn } from 'class-validator';
import { PLANS } from '../plans';

export class CreateCheckoutDto {
  @IsIn(PLANS.map((p) => p.id))
  planId: string;
}
