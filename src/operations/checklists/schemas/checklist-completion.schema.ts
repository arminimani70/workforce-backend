import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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

// One per shift — tracks each opening/closing item's explicit done/not-done status for that
// shift's employee. An item simply absent from the array means it hasn't been answered yet.
@Schema({ timestamps: true })
export class ChecklistCompletion {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true, index: true })
  shiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [ChecklistItemStatus], default: [] })
  openingStatuses: ChecklistItemStatus[];

  @Prop({ type: [ChecklistItemStatus], default: [] })
  closingStatuses: ChecklistItemStatus[];
}

export const ChecklistCompletionSchema =
  SchemaFactory.createForClass(ChecklistCompletion);

// One completion record per shift.
ChecklistCompletionSchema.index(
  { organizationId: 1, shiftId: 1 },
  { unique: true },
);
