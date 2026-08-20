import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Schema({ _id: false })
export class ConversationReadState {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  lastReadAt: Date;
}

export const ConversationReadStateSchema = SchemaFactory.createForClass(
  ConversationReadState,
);

// Either a direct (exactly 2 participants) or a manager-created group thread. Unread tracking
// is per-participant lastReadAt rather than a flag on every Message — cheap to update on open,
// and unread count is just "messages after my lastReadAt not sent by me".
@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: ConversationType, required: true })
  type: ConversationType;

  // Group display name — unused for direct conversations, whose "name" is always the other
  // participant's fullName, resolved client-side from participants.
  @Prop({ trim: true, maxlength: 150 })
  name?: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Only set for type: direct — the pair's two ids, sorted and joined, so a sparse unique index
  // stops a second direct conversation ever being created for the same pair.
  @Prop({ type: String })
  directKey?: string;

  @Prop({ type: [ConversationReadStateSchema], default: [] })
  readStates: ConversationReadState[];

  // Not @Prop-decorated — added by { timestamps: true } at the schema level; declared here
  // only so TS knows about them where code reads conversation.createdAt/updatedAt.
  createdAt: Date;
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ organizationId: 1, participants: 1 });
ConversationSchema.index(
  { organizationId: 1, directKey: 1 },
  { unique: true, sparse: true },
);
