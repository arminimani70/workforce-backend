import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  available: boolean;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm' })
  endTime?: string;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  days: DayAvailabilityDto[];
}
