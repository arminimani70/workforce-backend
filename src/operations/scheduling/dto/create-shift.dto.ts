import { IsISO8601, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsMongoId()
  employeeId: string;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;

  @IsOptional()
  @IsString()
  jobSite?: string;
}
