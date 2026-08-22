import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { ChatService } from './chat.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { SendConversationMessageDto } from './dto/send-conversation-message.dto';
import {
  CHAT_UPLOADS_DIR,
  chatAttachmentMulterOptions,
} from './chat-upload.config';

// Any authenticated org member can message any other, and open/read any conversation they're
// a participant of — only creating a group is restricted (see @Roles below).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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

  // Gets the existing 1:1 thread with this employee, or starts one — either way returns the
  // conversation to navigate into.
  @Post('conversations/direct')
  openDirect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.chatService.getOrCreateDirect(
      user.organizationId,
      user.userId,
      dto.employeeId,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post('conversations/group')
  createGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatService.createGroup(user.organizationId, user.userId, dto);
  }

  @Get('conversations/:id')
  getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.chatService.getMessages(user.organizationId, user.userId, id);
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(FileInterceptor('file', chatAttachmentMulterOptions))
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: SendConversationMessageDto,
  ) {
    return this.chatService.sendMessage(
      user.organizationId,
      user.userId,
      id,
      dto.text,
      file,
    );
  }

  @Patch('conversations/:id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.chatService.markRead(user.organizationId, user.userId, id);
  }

  // Streams the file itself, not just its metadata — any participant of the message's
  // conversation may download it.
  @Get('attachments/:messageId/download')
  async downloadAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.chatService.getAttachmentForDownload(
      user.organizationId,
      user.userId,
      messageId,
    );
    // @Res() hands the response to us directly, bypassing Nest's exception filters — a missing
    // file on disk (metadata exists, the file itself doesn't) needs its own error handling here.
    res.download(
      join(CHAT_UPLOADS_DIR, attachment.storedFileName),
      attachment.fileName,
      (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ message: 'File not found' });
        }
      },
    );
  }
}
