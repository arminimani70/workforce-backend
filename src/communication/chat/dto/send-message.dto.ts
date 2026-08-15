import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsMongoId()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
