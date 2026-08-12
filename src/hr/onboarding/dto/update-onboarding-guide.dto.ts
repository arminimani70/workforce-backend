import { IsString, MaxLength } from 'class-validator';

export class UpdateOnboardingGuideDto {
  @IsString()
  @MaxLength(20000)
  content: string;
}
