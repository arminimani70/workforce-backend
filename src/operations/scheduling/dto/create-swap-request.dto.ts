import { IsMongoId } from 'class-validator';

export class CreateSwapRequestDto {
  @IsMongoId()
  requestingShiftId: string;

  @IsMongoId()
  targetShiftId: string;
}
