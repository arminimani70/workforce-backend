import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AvailabilityDocument = HydratedDocument<Availability>;

// 0 = Monday .. 6 = Sunday (ISO week order), matching how the frontend renders the week.
@Schema({ _id: false })
class DayAvailability {
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ required: true, default: false })
  available: boolean;

  // "HH:mm", 24-hour. Only meaningful when available is true.
  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;
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
