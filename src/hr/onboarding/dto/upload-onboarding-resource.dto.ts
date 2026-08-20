import { IsOptional, IsString, MaxLength } from 'class-validator';

// The file itself arrives as multipart form data via FileInterceptor, not through this DTO —
// this only covers the accompanying form fields multer leaves on req.body.
export class UploadOnboardingResourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
