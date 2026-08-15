import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Position } from '../schemas/checklist-template.schema';

export class UpsertChecklistTemplateDto {
  @IsEnum(Position)
  position: Position;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jobSite: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  openingItems: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  closingItems: string[];
}
