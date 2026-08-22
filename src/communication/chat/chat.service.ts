import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { UsersService } from '../../users/users.service';

export interface PopulatedParty {
  _id: { toString(): string };
  fullName: string;
  role: string;
}

function directKeyFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
  ) {}

  private async assertMemberInOrg(organizationId: string, userId: string) {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException('Team member not found');
    }
    const member = await this.usersService.findById(userId);
    if (member.organizationId.toString() !== organizationId) {
      throw new NotFoundException('Team member not found');
    }
    return member;
  }

  // Loads a conversation and throws unless the caller is one of its participants — every
  // conversation-scoped operation (read, send, mark read, download) starts here.
  private async assertParticipant(
    organizationId: string,
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    if (!isValidObjectId(conversationId)) {
      throw new NotFoundException('Conversation not found');
    }
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      organizationId,
    });
    if (
      !conversation ||
      !conversation.participants.some((p) => p.toString() === userId)
    ) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async getOrCreateDirect(
    organizationId: string,
    userId: string,
    otherEmployeeId: string,
  ) {
    if (otherEmployeeId === userId) {
      throw new BadRequestException('Cannot message yourself');
    }
    await this.assertMemberInOrg(organizationId, otherEmployeeId);

    const directKey = directKeyFor(userId, otherEmployeeId);
    const existing = await this.conversationModel.findOne({
      organizationId,
      directKey,
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.conversationModel.create({
        organizationId,
        type: ConversationType.DIRECT,
        participants: [userId, otherEmployeeId],
        createdBy: userId,
        directKey,
      });
    } catch {
      // Lost a create race against the other participant opening the same thread at the same
      // moment — the sparse unique index on directKey rejected ours; theirs already exists.
      const winner = await this.conversationModel.findOne({
        organizationId,
        directKey,
      });
      if (!winner)
        throw new BadRequestException('Could not start conversation');
      return winner;
    }
  }

  async createGroup(
    organizationId: string,
    userId: string,
    dto: CreateGroupConversationDto,
  ) {
    const otherIds = [...new Set(dto.participantIds)].filter(
      (id) => id !== userId,
    );
    await Promise.all(
      otherIds.map((id) => this.assertMemberInOrg(organizationId, id)),
    );

    return this.conversationModel.create({
      organizationId,
      type: ConversationType.GROUP,
      name: dto.name.trim(),
      participants: [userId, ...otherIds],
      createdBy: userId,
    });
  }

  // Every conversation the caller is part of, newest activity first, with the last message and
  // an unread count derived from their own lastReadAt on that conversation.
  async findConversations(organizationId: string, userId: string) {
    const conversations = await this.conversationModel
      .find({ organizationId, participants: userId })
      .populate<{ participants: PopulatedParty[] }>(
        'participants',
        'fullName role',
      )
      .sort({ updatedAt: -1 });

    return Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await this.messageModel
          .findOne({ conversationId: conversation._id })
          .sort({ createdAt: -1 });

        const lastReadAt = conversation.readStates.find(
          (r) => r.userId.toString() === userId,
        )?.lastReadAt;

        const unreadCount = await this.messageModel.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: userId },
          ...(lastReadAt && { createdAt: { $gt: lastReadAt } }),
        });

        return {
          _id: conversation._id,
          type: conversation.type,
          name: conversation.name,
          participants: conversation.participants,
          lastMessage: lastMessage?.text ?? null,
          lastMessageAt: lastMessage?.createdAt ?? conversation.createdAt,
          lastMessageFromMe: lastMessage
            ? lastMessage.senderId.toString() === userId
            : false,
          unreadCount,
        };
      }),
    ).then((result) =>
      result.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      ),
    );
  }

  async countUnread(organizationId: string, userId: string) {
    const conversations = await this.findConversations(organizationId, userId);
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  async getMessages(
    organizationId: string,
    userId: string,
    conversationId: string,
  ) {
    await this.assertParticipant(organizationId, conversationId, userId);
    return this.messageModel
      .find({ conversationId })
      .populate('senderId', 'fullName role')
      .sort({ createdAt: 1 });
  }

  async sendMessage(
    organizationId: string,
    userId: string,
    conversationId: string,
    text: string | undefined,
    file: Express.Multer.File | undefined,
  ) {
    await this.assertParticipant(organizationId, conversationId, userId);
    const trimmedText = text?.trim() ?? '';
    if (!trimmedText && !file) {
      throw new BadRequestException('A message needs text or an attachment');
    }

    const message = await this.messageModel.create({
      organizationId,
      conversationId,
      senderId: userId,
      text: trimmedText,
      attachment: file
        ? {
            fileName: file.originalname,
            storedFileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
          }
        : undefined,
    });
    return message.populate('senderId', 'fullName role');
  }

  async markRead(
    organizationId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.assertParticipant(
      organizationId,
      conversationId,
      userId,
    );
    const existing = conversation.readStates.find(
      (r) => r.userId.toString() === userId,
    );
    if (existing) {
      existing.lastReadAt = new Date();
    } else {
      conversation.readStates.push({
        userId: new Types.ObjectId(userId),
        lastReadAt: new Date(),
      });
    }
    await conversation.save();
  }

  async getAttachmentForDownload(
    organizationId: string,
    userId: string,
    messageId: string,
  ) {
    if (!isValidObjectId(messageId)) {
      throw new NotFoundException('Attachment not found');
    }
    const message = await this.messageModel.findOne({
      _id: messageId,
      organizationId,
    });
    if (!message || !message.attachment) {
      throw new NotFoundException('Attachment not found');
    }
    // Only a participant of the conversation this message belongs to may download it.
    await this.assertParticipant(
      organizationId,
      message.conversationId.toString(),
      userId,
    );
    return message.attachment;
  }
}
