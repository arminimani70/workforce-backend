import { IsISO8601, IsMongoId } from 'class-validator';

export class CreateShiftEditRequestDto {
  @IsMongoId()
  shiftId: string;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;
}
