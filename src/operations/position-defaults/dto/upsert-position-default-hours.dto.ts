import { IsEnum, Matches } from 'class-validator';
import { Position } from '../../../common/enums/position.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertPositionDefaultHoursDto {
  @IsEnum(Position)
  position: Position;

  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm' })
  startTime: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm' })
  endTime: string;
}
