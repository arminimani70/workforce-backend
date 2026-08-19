import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type ChecklistCompletionDocument = HydratedDocument<ChecklistCompletion>;

// Every item is explicitly marked done or not done — never left in a neutral "unanswered"
// state once touched. Storing the item text (not an index into the template) so a completion
// record stays meaningful even if the template's item list is edited later.
@Schema({ _id: false })
export class ChecklistItemStatus {
  @Prop({ required: true })
  item: string;

  @Prop({ required: true })
  done: boolean;

  // Optional proof-of-completion photo, a base64 data URI like User.avatarUrl — attached after
  // the item is marked, so it's only ever set alongside an existing done/not-done value.
  @Prop()
  photoUrl?: string;

  // Optional free-text note, same "attached after the item is marked" convention as photoUrl.
  @Prop({ maxlength: 1000 })
  note?: string;
}

// The one live, shared "clipboard" per (position, branch) — not per employee, not per day.
// Multiple different people can hold the same position at the same branch across a day (shift
// handoffs), so whoever's on duty marks this same sheet; submitting a section archives its
// current state to ChecklistSubmission and resets that section back to blank here, ready for
// the next person. Persists indefinitely otherwise — it only ever changes because someone
// marks/submits it, or because a manager edits the underlying template.
@Schema({ timestamps: true })
export class ChecklistCompletion {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: Position, required: true })
  position: Position;

  // Blank means the position's branch-less default, same convention as ChecklistTemplate.
  @Prop({ maxlength: 100, default: '' })
  jobSite: string;

  @Prop({ type: [ChecklistItemStatus], default: [] })
  openingStatuses: ChecklistItemStatus[];

  @Prop({ type: [ChecklistItemStatus], default: [] })
  closingStatuses: ChecklistItemStatus[];

  // Informational only — whoever most recently marked an item, not part of the lookup key.
  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUpdatedBy?: Types.ObjectId;
}

export const ChecklistCompletionSchema =
  SchemaFactory.createForClass(ChecklistCompletion);

// One live sheet per position+branch combination.
ChecklistCompletionSchema.index(
  { organizationId: 1, position: 1, jobSite: 1 },
  { unique: true },
);
