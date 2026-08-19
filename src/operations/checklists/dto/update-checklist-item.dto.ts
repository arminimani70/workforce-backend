import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

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
}
