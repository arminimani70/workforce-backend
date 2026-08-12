import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

// GPS is best-effort: a browser/device without location permission should still be able to
// clock in/out, so both fields are optional rather than required.
export class ClockLocationDto {
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
