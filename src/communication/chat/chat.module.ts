import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { UsersModule } from '../../users/users.module';
import { ensureChatUploadsDir } from './chat-upload.config';

@Injectable()
class ChatUploadsDirInit implements OnModuleInit {
  onModuleInit() {
    ensureChatUploadsDir();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    UsersModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatUploadsDirInit],
})
export class ChatModule {}
