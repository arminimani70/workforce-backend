import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

export class UpsertChecklistTemplateDto {
  @IsEnum(Position)
  position: Position;

  // Blank/omitted means "every branch" for this position.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobSite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  openingItems: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  closingItems: string[];
}
