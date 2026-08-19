import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCompletionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  item: string;

  @IsBoolean()
  done: boolean;
}
