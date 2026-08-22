import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { SubscriptionStatus } from '../../organizations/schemas/organization.schema';

// A super-admin override — bumping/cutting seats or flipping subscription state by hand,
// bypassing Lemon Squeezy (comped seats, support fixes, manual cancellation, etc.).
export class UpdateOrganizationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number;

  @IsOptional()
  @IsIn(Object.values(SubscriptionStatus))
  subscriptionStatus?: SubscriptionStatus;
}
