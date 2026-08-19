import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ClockLocationDto } from './clock-location.dto';
import { Position } from '../../../common/enums/position.enum';

// dayStart/dayEnd are the caller's local "today" bounds (the device's timezone, not the
// server's) — TimeClockService uses them to check for a shift scheduled today instead of
// computing its own day boundary, which would drift from what the employee actually sees as
// "today" on their phone.
export class ClockInDto extends ClockLocationDto {
  @IsOptional()
  @IsISO8601()
  dayStart?: string;

  @IsOptional()
  @IsISO8601()
  dayEnd?: string;

  // reason/jobSite/position are present only for a clock-in with no shift scheduled today —
  // required by the service in that case (a reason is what makes it accept the clock-in at
  // all), otherwise ignored.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobSite?: string;

  @IsOptional()
  @IsEnum(Position)
  position?: Position;
}
