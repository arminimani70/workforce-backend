import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Position } from '../../../common/enums/position.enum';

// Same task title/description repeated across multiple due dates, each independently resolved
// to whoever is approved for `position` on that specific day — e.g. "whoever is Help Desk"
// on Monday, Wednesday, and Friday of a given week, who may well be three different people.
export class CreateTaskBatchDto {
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(Position)
  position: Position;

  @IsArray()
  @ArrayMinSize(1)
  @IsISO8601({}, { each: true })
  dueDates: string[];
}
