import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyEur?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lemonSqueezyVariantId?: string;
}
