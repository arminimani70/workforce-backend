import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type AvailabilityDocument = HydratedDocument<Availability>;

export { Position };

export enum AvailabilityStatus {
  // Can't work this day at all.
  UNAVAILABLE = 'unavailable',
  // Has a specific time window + position(s) they can work.
  AVAILABLE = 'available',
  // No preference — the manager decides whether/how to schedule them.
  FLEXIBLE = 'flexible',
}

// One document per (employee, exact calendar date) — not a recurring weekly pattern. An
// employee with no document for a given date simply hasn't set a preference for it yet.
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

  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, enum: AvailabilityStatus, required: true })
  status: AvailabilityStatus;

  // "HH:mm", 24-hour. Only meaningful when status is AVAILABLE.
  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop({ type: [String], enum: Position, default: [] })
  positions: Position[];
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// One entry per employee per date.
AvailabilitySchema.index(
  { organizationId: 1, employeeId: 1, date: 1 },
  { unique: true },
);
