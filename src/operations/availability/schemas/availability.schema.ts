import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type AvailabilityDocument = HydratedDocument<Availability>;

export { Position };

export enum DayAvailabilityStatus {
  // Can't work this day at all.
  UNAVAILABLE = 'unavailable',
  // Has a specific time window + position(s) they can work.
  AVAILABLE = 'available',
  // No preference — the manager decides whether/how to schedule them.
  FLEXIBLE = 'flexible',
}

// 0 = Monday .. 6 = Sunday (ISO week order), matching how the frontend renders the week.
@Schema({ _id: false })
class DayAvailability {
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: String, enum: DayAvailabilityStatus, required: true })
  status: DayAvailabilityStatus;

  // "HH:mm", 24-hour. Only meaningful when status is AVAILABLE.
  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop({ type: [String], enum: Position, default: [] })
  positions: Position[];
}

@Schema({ timestamps: true })
export class Availability {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [DayAvailability], required: true })
  days: DayAvailability[];
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// One recurring weekly availability profile per employee.
AvailabilitySchema.index(
  { organizationId: 1, employeeId: 1 },
  { unique: true },
);
