import { IsMongoId, IsOptional } from 'class-validator';

export class CreateSwapRequestDto {
  @IsMongoId()
  requestingShiftId: string;

  // Omit for a "Free Volunteer" broadcast (open to anyone free that day) instead of naming a
  // specific person.
  @IsOptional()
  @IsMongoId()
  targetEmployeeId?: string;
}
