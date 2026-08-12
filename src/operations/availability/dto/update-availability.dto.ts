import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DayAvailabilityStatus,
  Position,
} from '../schemas/availability.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsEnum(DayAvailabilityStatus)
  status: DayAvailabilityStatus;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Position, { each: true })
  positions?: Position[];
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  days: DayAvailabilityDto[];
}
