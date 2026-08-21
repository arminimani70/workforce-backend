import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

export enum SubscriptionStatus {
  // No plan chosen/paid yet, or the trial has run out — the org can still register and log in,
  // but billing.controller/users.controller enforce the free seat cap until this changes.
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

// A free trial gets this many seats before a plan is required to add more people.
export const TRIAL_SEAT_LIMIT = 5;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  industry?: string;

  // Set right after the owner User is created (registration creates Org then User then links this back).
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIALING,
  })
  subscriptionStatus: SubscriptionStatus;

  // Max users (owner + managers + employees combined) the org may create. Raised by the
  // billing webhook when a paid plan's subscription_created/updated event lands.
  @Prop({ default: TRIAL_SEAT_LIMIT })
  seatLimit: number;

  // Matches an id in billing/plans.ts — unset while trialing.
  @Prop()
  planId?: string;

  @Prop()
  lemonSqueezyCustomerId?: string;

  @Prop()
  lemonSqueezySubscriptionId?: string;

  @Prop({ type: Date })
  currentPeriodEnd?: Date;

  // Not @Prop-decorated — added by { timestamps: true } at the schema level; declared here
  // only so TS knows about them where code reads organization.createdAt.
  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
