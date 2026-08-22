import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

// The file itself lives on local disk under UPLOADS_DIR (see chat-upload.config.ts) —
// storedFileName is its name there (random, so it never collides or leaks the original
// filename in a URL/path). This subdocument is just the metadata needed to list/download it.
@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storedFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;
}

export const MessageAttachmentSchema =
  SchemaFactory.createForClass(MessageAttachment);

// A message inside a Conversation (direct or group — see conversation.schema.ts). text is
// optional since a message can be attachment-only; the service rejects a message with neither.
@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId: Types.ObjectId;

  @Prop({ default: '', maxlength: 5000 })
  text: string;

  @Prop({ type: MessageAttachmentSchema })
  attachment?: MessageAttachment;

  // Not @Prop-decorated — added by { timestamps: true } at the schema level; declared here
  // only so TS knows about them where code reads message.createdAt.
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Powers "every message in this conversation, oldest first" lookups.
MessageSchema.index({ organizationId: 1, conversationId: 1, createdAt: 1 });
