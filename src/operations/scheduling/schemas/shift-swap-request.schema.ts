import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShiftSwapRequestDocument = HydratedDocument<ShiftSwapRequest>;

export enum SwapRequestStatus {
  // Waiting on the target employee to accept or decline.
  PENDING_TARGET = 'pending_target',
  // Target accepted — waiting on an owner/manager for final approval.
  PENDING_MANAGER = 'pending_manager',
  // Manager approved — the two shifts' employeeId have been swapped.
  APPROVED = 'approved',
  // Declined by the target, or denied by a manager.
  REJECTED = 'rejected',
  // Withdrawn by the requester before the target responded.
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class ShiftSwapRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  requestingShiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestingEmployeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  targetShiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  targetEmployeeId: Types.ObjectId;

  @Prop({
    type: String,
    enum: SwapRequestStatus,
    default: SwapRequestStatus.PENDING_TARGET,
  })
  status: SwapRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  decidedBy?: Types.ObjectId;
}

export const ShiftSwapRequestSchema =
  SchemaFactory.createForClass(ShiftSwapRequest);

ShiftSwapRequestSchema.index({ organizationId: 1, status: 1 });
