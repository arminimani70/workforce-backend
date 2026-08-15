import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChecklistCompletionDocument = HydratedDocument<ChecklistCompletion>;

// One per shift — tracks which opening/closing items that shift's employee has checked off.
// Storing the checked item text (not an index into the template) so a completion record stays
// meaningful even if the template's item list is edited later.
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

  @Prop({ type: [String], default: [] })
  openingCompletedItems: string[];

  @Prop({ type: [String], default: [] })
  closingCompletedItems: string[];
}

export const ChecklistCompletionSchema =
  SchemaFactory.createForClass(ChecklistCompletion);

// One completion record per shift.
ChecklistCompletionSchema.index(
  { organizationId: 1, shiftId: 1 },
  { unique: true },
);
