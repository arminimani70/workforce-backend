import { IsOptional, IsString, MaxLength } from 'class-validator';

// text is optional — an attachment-only message is valid; the service rejects a message with
// neither text nor a file.
export class SendConversationMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;
}
