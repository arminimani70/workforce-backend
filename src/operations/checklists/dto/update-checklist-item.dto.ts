import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

// Deliberately smaller than a profile avatar's cap — a checklist photo should already be
// resized/compressed client-side before upload, and each PATCH here carries at most one.
const PHOTO_DATA_URI_PATTERN =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/;

export class UpdateChecklistItemDto {
  @IsEnum(Position)
  position: Position;

  // Blank/omitted means the position's branch-less default.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobSite?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  item: string;

  @IsBoolean()
  done: boolean;

  // Optional proof-of-completion photo, attached after the item is marked.
  @IsOptional()
  @Matches(PHOTO_DATA_URI_PATTERN, {
    message: 'photoUrl must be a base64 data URI (image/png, jpeg, or webp)',
  })
  @MaxLength(400_000)
  photoUrl?: string;

  // Optional free-text note, same "attached after the item is marked" convention as photoUrl.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
