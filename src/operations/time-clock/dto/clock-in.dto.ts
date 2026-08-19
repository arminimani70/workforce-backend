import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClockLocationDto } from './clock-location.dto';

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

  // Present only for an emergency clock-in (no shift scheduled today) — required by the
  // service in that case, otherwise ignored.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
