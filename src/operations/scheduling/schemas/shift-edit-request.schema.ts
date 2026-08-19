import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShiftEditRequestDocument = HydratedDocument<ShiftEditRequest>;

export enum ShiftEditRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// A request to correct the recorded start/end time of a shift that has already happened —
// e.g. it actually ran later than scheduled. Kept separate from just editing the Shift
// directly so a manager signs off before historical records change.
@Schema({ timestamps: true })
export class ShiftEditRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  shiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy: Types.ObjectId;

  // The shift's own startTime/endTime stay unchanged until this request is approved.
  @Prop({ required: true })
  newStartTime: Date;

  @Prop({ required: true })
  newEndTime: Date;

  @Prop({
    type: String,
    enum: ShiftEditRequestStatus,
    default: ShiftEditRequestStatus.PENDING,
  })
  status: ShiftEditRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  decidedBy?: Types.ObjectId;
}

export const ShiftEditRequestSchema =
  SchemaFactory.createForClass(ShiftEditRequest);

ShiftEditRequestSchema.index({ organizationId: 1, status: 1 });
