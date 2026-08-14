import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  Matches,
} from 'class-validator';
import { AvailabilityStatus, Position } from '../schemas/availability.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateAvailabilityDto {
  @IsISO8601()
  date: string;

  @IsEnum(AvailabilityStatus)
  status: AvailabilityStatus;

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
