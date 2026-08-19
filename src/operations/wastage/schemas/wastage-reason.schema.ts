import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WastageReasonDocument = HydratedDocument<WastageReason>;

// An org-wide, manager-editable catalog of wastage reasons (e.g. "Expired", "Damaged",
// "Spilled") that populates the reason picker on the wastage submission form.
@Schema({ timestamps: true })
export class WastageReason {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  label: string;
}

export const WastageReasonSchema = SchemaFactory.createForClass(WastageReason);

WastageReasonSchema.index({ organizationId: 1, label: 1 }, { unique: true });
