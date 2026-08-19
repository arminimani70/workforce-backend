import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

export class ResolveChecklistDto {
  @IsEnum(Position)
  position: Position;

  // Blank/omitted means the position's branch-less default.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobSite?: string;
}
