import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertWastageReasonDto {
  // Present only when renaming an existing reason; omitted when creating a new one.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;
}
