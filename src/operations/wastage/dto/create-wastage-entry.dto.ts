import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWastageEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jobSite: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  productName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  amount: string;

  // When the waste actually happened, e.g. "2026-08-15" — omit to default to now.
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
