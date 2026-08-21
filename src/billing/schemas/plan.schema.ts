import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanDocument = HydratedDocument<Plan>;

// A purchasable tier — editable from the platform-admin panel (super-admin only) instead of
// hardcoded, so pricing/seat limits can change without a deploy. priceMonthlyEur is display
// only: the amount actually charged is whatever the linked Lemon Squeezy variant is configured
// for over there, so keep the two in sync by hand when either changes.
@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 1 })
  seatLimit: number;

  @Prop({ required: true, min: 0 })
  priceMonthlyEur: number;

  // Absent until someone sets it (from the platform-admin panel) — checkout for a plan with no
  // variant id configured yet fails with a clear "not configured" error rather than a silent 500.
  @Prop()
  lemonSqueezyVariantId?: string;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
