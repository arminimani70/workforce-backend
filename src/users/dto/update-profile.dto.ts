import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// A data: URI, not an external link — capped well above what a reasonably-compressed profile
// photo needs (a few hundred KB) so a client that forgets to resize before upload gets a
// clear 400 instead of silently bloating the document.
const AVATAR_DATA_URI_PATTERN =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @IsOptional()
  @Matches(AVATAR_DATA_URI_PATTERN, {
    message: 'avatarUrl must be a base64 data URI (image/png, jpeg, or webp)',
  })
  @MaxLength(700_000)
  avatarUrl?: string;
}
