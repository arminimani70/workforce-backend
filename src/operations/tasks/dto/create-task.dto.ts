import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Position } from '../../../common/enums/position.enum';

// Assign directly with employeeId, or omit it and give position instead — the server resolves
// whoever is approved to work that position on dueDate.
export class CreateTaskDto {
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  dueDate: string;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(Position)
  position?: Position;
}
