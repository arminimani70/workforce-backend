import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

// Any authenticated org member can message any other — no role restriction here.
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.chatService.send(user.organizationId, user.userId, dto);
  }

  @Get('conversations')
  findConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findConversations(user.organizationId, user.userId);
  }

  @Get('unread-count')
  async countUnread(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.chatService.countUnread(
      user.organizationId,
      user.userId,
    );
    return { count };
  }

  @Get('with/:employeeId')
  findThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.chatService.findThread(
      user.organizationId,
      user.userId,
      employeeId,
    );
  }

  @Patch('with/:employeeId/read')
  markThreadRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.chatService.markThreadRead(
      user.organizationId,
      user.userId,
      employeeId,
    );
  }
}
