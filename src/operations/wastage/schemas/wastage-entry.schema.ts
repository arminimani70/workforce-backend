import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WastageEntryDocument = HydratedDocument<WastageEntry>;

// One per reported wastage event. jobSite and reason are picked from existing lists (the
// branch catalog and the org's WastageReason catalog) but stored as plain-text snapshots, the
// same "snapshot not reference" convention used for Shift.jobSite — a renamed/deleted branch
// or reason never corrupts a past report. productName/amount are the only fields the employee
// types by hand.
@Schema({ timestamps: true })
export class WastageEntry {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  jobSite: string;

  @Prop({ required: true, maxlength: 100 })
  reason: string;

  @Prop({ required: true, maxlength: 150 })
  productName: string;

  @Prop({ required: true, maxlength: 50 })
  amount: string;

  // Not @Prop-decorated — added by { timestamps: true }; declared so TS knows about it.
  createdAt: Date;
}

export const WastageEntrySchema = SchemaFactory.createForClass(WastageEntry);

WastageEntrySchema.index({ organizationId: 1, createdAt: -1 });
