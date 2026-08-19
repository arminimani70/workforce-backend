import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

export class SubmitChecklistSectionDto {
  @IsEnum(Position)
  position: Position;

  // Blank/omitted means the position's branch-less default.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobSite?: string;

  // SVG path data for a hand-drawn signature, required to confirm a submission.
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  signature: string;
}
