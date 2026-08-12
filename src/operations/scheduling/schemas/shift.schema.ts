import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type ShiftDocument = HydratedDocument<Shift>;

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  MISSED = 'missed',
}

export enum ShiftApproval {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Shift {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ trim: true })
  jobSite?: string;

  @Prop({ type: String, enum: Position })
  position?: Position;

  @Prop({ type: String, enum: ShiftStatus, default: ShiftStatus.SCHEDULED })
  status: ShiftStatus;

  // A manager/owner must approve a shift before the assigned employee can see it.
  @Prop({ type: String, enum: ShiftApproval, default: ShiftApproval.PENDING })
  approval: ShiftApproval;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

ShiftSchema.index({ organizationId: 1, employeeId: 1, startTime: 1 });
