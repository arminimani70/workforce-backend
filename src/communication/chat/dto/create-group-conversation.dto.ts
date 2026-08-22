import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  // The other participants — the creator is added automatically, so this excludes them.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  participantIds: string[];
}
