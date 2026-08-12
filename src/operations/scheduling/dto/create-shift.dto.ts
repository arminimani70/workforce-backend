import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { Position } from '../../../common/enums/position.enum';

export class CreateShiftDto {
  @IsMongoId()
  employeeId: string;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;

  @IsOptional()
  @IsString()
  jobSite?: string;

  @IsOptional()
  @IsEnum(Position)
  position?: Position;
}
