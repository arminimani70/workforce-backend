import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type ShiftSwapRequestDocument = HydratedDocument<ShiftSwapRequest>;

export enum SwapRequestStatus {
  // No target picked yet — a "Free Volunteer" broadcast, visible to any employee free that
  // day, waiting for one of them to claim it.
  OPEN = 'open',
  // A specific target was named — waiting on them to accept or decline.
  PENDING_TARGET = 'pending_target',
  // Target accepted (or a volunteer claimed an open request) — waiting on an owner/manager
  // for final approval.
  PENDING_MANAGER = 'pending_manager',
  // Manager approved — the shift(s) have been reassigned.
  APPROVED = 'approved',
  // Declined by the target, or denied by a manager.
  REJECTED = 'rejected',
  // Withdrawn by the requester before the target responded (or before anyone volunteered).
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

  // A copy of the requesting shift's position at creation time — lets an open request be
  // matched to eligible volunteers without a join back to the shift.
  @Prop({ type: String, enum: Position })
  position?: Position;

  // Absent when the target has no shift that day themselves — there's nothing of theirs to
  // swap back, so approval just reassigns requestingShiftId instead of trading two shifts.
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  targetShiftId?: Types.ObjectId;

  // Absent while the request is OPEN (no specific person picked/claimed yet).
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  targetEmployeeId?: Types.ObjectId;

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
