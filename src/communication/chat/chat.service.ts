import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../../users/users.service';

export interface PopulatedParty {
  _id: { toString(): string };
  fullName: string;
  role: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
  ) {}

  private async assertRecipientInOrg(
    organizationId: string,
    recipientId: string,
  ) {
    if (!isValidObjectId(recipientId)) {
      throw new NotFoundException('Recipient not found');
    }
    const recipient = await this.usersService.findById(recipientId);
    if (recipient.organizationId.toString() !== organizationId) {
      throw new NotFoundException('Recipient not found');
    }
    return recipient;
  }

  async send(organizationId: string, senderId: string, dto: SendMessageDto) {
    if (dto.recipientId === senderId) {
      throw new BadRequestException('Cannot message yourself');
    }
    await this.assertRecipientInOrg(organizationId, dto.recipientId);

    const message = await this.messageModel.create({
      organizationId,
      senderId,
      recipientId: dto.recipientId,
      text: dto.text,
    });
    return message.populate('senderId', 'fullName role');
  }

  // Every message the caller has sent or received, newest first, grouped in memory by "the
  // other person" — an org's whole message history is small enough that a plain in-memory
  // group beats reaching for an aggregation pipeline.
  async findConversations(organizationId: string, employeeId: string) {
    const messages = await this.messageModel
      .find({
        organizationId,
        $or: [{ senderId: employeeId }, { recipientId: employeeId }],
      })
      .populate<{ senderId: PopulatedParty; recipientId: PopulatedParty }>(
        'senderId',
        'fullName role',
      )
      .populate<{ senderId: PopulatedParty; recipientId: PopulatedParty }>(
        'recipientId',
        'fullName role',
      )
      .sort({ createdAt: -1 });

    const conversations = new Map<
      string,
      {
        employeeId: PopulatedParty;
        lastMessage: string;
        lastMessageAt: Date;
        lastMessageFromMe: boolean;
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const iAmSender = message.senderId._id.toString() === employeeId;
      const otherParty = iAmSender ? message.recipientId : message.senderId;
      const otherId = otherParty._id.toString();

      if (!conversations.has(otherId)) {
        conversations.set(otherId, {
          employeeId: otherParty,
          lastMessage: message.text,
          lastMessageAt: message.createdAt,
          lastMessageFromMe: iAmSender,
          unreadCount: 0,
        });
      }
      if (!iAmSender && !message.readAt) {
        conversations.get(otherId)!.unreadCount += 1;
      }
    }

    return Array.from(conversations.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );
  }

  countUnread(organizationId: string, employeeId: string) {
    return this.messageModel.countDocuments({
      organizationId,
      recipientId: employeeId,
      readAt: null,
    });
  }

  async findThread(
    organizationId: string,
    employeeId: string,
    otherEmployeeId: string,
  ) {
    await this.assertRecipientInOrg(organizationId, otherEmployeeId);
    return this.messageModel
      .find({
        organizationId,
        $or: [
          { senderId: employeeId, recipientId: otherEmployeeId },
          { senderId: otherEmployeeId, recipientId: employeeId },
        ],
      })
      .populate('senderId', 'fullName role')
      .sort({ createdAt: 1 });
  }

  async markThreadRead(
    organizationId: string,
    employeeId: string,
    otherEmployeeId: string,
  ) {
    await this.messageModel.updateMany(
      {
        organizationId,
        senderId: otherEmployeeId,
        recipientId: employeeId,
        readAt: null,
      },
      { readAt: new Date() },
    );
  }
}
