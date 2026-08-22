import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type PositionDefaultHoursDocument =
  HydratedDocument<PositionDefaultHours>;

// Different jobs start and end at different times (front desk might open at 7am, the manager
// on duty might not come in until 9). One document per (organization, position) — set by an
// owner/manager, read by every employee's Availability screen to prefill the start/end time
// for whichever position they pick, instead of a single hardcoded 09:00-17:00 for everyone.
@Schema({ timestamps: true })
export class PositionDefaultHours {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: Position, required: true })
  position: Position;

  // "HH:mm", 24-hour.
  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;
}

export const PositionDefaultHoursSchema =
  SchemaFactory.createForClass(PositionDefaultHours);

PositionDefaultHoursSchema.index(
  { organizationId: 1, position: 1 },
  { unique: true },
);
