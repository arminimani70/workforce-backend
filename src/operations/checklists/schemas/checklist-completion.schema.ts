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
}

// One per (employee, calendar day, position, branch) — not tied to a shift, so an employee can
// fill out today's opening/closing checklist for their position even on a day they have no
// shift scheduled. Tracks each item's explicit done/not-done status, plus when each section was
// submitted (null until the employee explicitly submits it, once every item is answered) so
// owner/manager can review what's actually been confirmed rather than just in-progress edits.
@Schema({ timestamps: true })
export class ChecklistCompletion {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  // Normalized to midnight — the calendar day this completion is for.
  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, enum: Position, required: true })
  position: Position;

  // Blank means the position's branch-less default, same convention as ChecklistTemplate.
  @Prop({ maxlength: 100, default: '' })
  jobSite: string;

  @Prop({ type: [ChecklistItemStatus], default: [] })
  openingStatuses: ChecklistItemStatus[];

  @Prop({ type: [ChecklistItemStatus], default: [] })
  closingStatuses: ChecklistItemStatus[];

  @Prop({ type: Date, default: null })
  openingSubmittedAt: Date | null;

  @Prop({ type: Date, default: null })
  closingSubmittedAt: Date | null;
}

export const ChecklistCompletionSchema =
  SchemaFactory.createForClass(ChecklistCompletion);

// One completion record per employee+day+position+branch combination.
ChecklistCompletionSchema.index(
  { organizationId: 1, employeeId: 1, date: 1, position: 1, jobSite: 1 },
  { unique: true },
);
