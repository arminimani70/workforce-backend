import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

// Deliberately smaller than a profile avatar's cap — a checklist photo should already be
// resized/compressed client-side before upload.
const PHOTO_DATA_URI_PATTERN =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/;

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

  // Proof-of-completion photos for the round as a whole, captured once at submit time — not one
  // per item — and capped at 8.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(PHOTO_DATA_URI_PATTERN, {
    each: true,
    message: 'each photo must be a base64 data URI (image/png, jpeg, or webp)',
  })
  @MaxLength(400_000, { each: true })
  photos?: string[];
}
