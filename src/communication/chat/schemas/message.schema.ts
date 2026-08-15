import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

// Direct 1:1 messages between two org members — no group chat, no separate Conversation
// entity; a "conversation" is just every Message between two particular people, derived on
// read. Text-only for now; the schema leaves room for an attachment without a migration once
// that's actually needed (image/PDF/Word upload), but nothing writes to those fields yet.
@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true, maxlength: 5000 })
  text: string;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  // Not @Prop-decorated — added by { timestamps: true } at the schema level; declared here
  // only so TS knows about them where code reads message.createdAt.
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Powers "every message between these two people" lookups (both directions).
MessageSchema.index({
  organizationId: 1,
  senderId: 1,
  recipientId: 1,
  createdAt: -1,
});
MessageSchema.index({
  organizationId: 1,
  recipientId: 1,
  senderId: 1,
  createdAt: -1,
});
