import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderListTemplateDocument = HydratedDocument<OrderListTemplate>;

@Schema({ _id: false })
export class OrderListItem {
  @Prop({ required: true, maxlength: 150 })
  productName: string;

  @Prop({ required: true, maxlength: 50 })
  unit: string;
}

// A manager-built, named list of supplies a branch can order (e.g. "Weekly Bar Order") —
// jobSite is a plain-text branch-name snapshot, same convention as Shift.jobSite. The manager
// only fills in productName/unit per row; whoever submits an order only ever enters a quantity
// against each of these predefined rows, weekly or as often as the branch needs to reorder.
@Schema({ timestamps: true })
export class OrderListTemplate {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  jobSite: string;

  @Prop({ required: true, maxlength: 150 })
  title: string;

  @Prop({ type: [OrderListItem], default: [] })
  items: OrderListItem[];
}

export const OrderListTemplateSchema =
  SchemaFactory.createForClass(OrderListTemplate);

// No two lists at the same branch share a name.
OrderListTemplateSchema.index(
  { organizationId: 1, jobSite: 1, title: 1 },
  { unique: true },
);
