import { IsMongoId } from 'class-validator';

export class CreateDirectConversationDto {
  @IsMongoId()
  employeeId: string;
}
