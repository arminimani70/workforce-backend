import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderListSubmissionDocument = HydratedDocument<OrderListSubmission>;

@Schema({ _id: false })
export class OrderListEntryValue {
  @Prop({ required: true, maxlength: 150 })
  productName: string;

  @Prop({ required: true, maxlength: 50 })
  unit: string;

  // Decimal, deliberately — a product's order quantity might be fractional (half a kilo, 1.5
  // cases), so this is never rounded or validated as an integer.
  @Prop({ required: true, min: 0 })
  quantity: number;
}

// One per submitted order — snapshots the template's title/branch and each row's
// productName/unit alongside the ordered quantity, so a submission stays readable even if the
// template is edited or deleted later.
@Schema({ timestamps: true })
export class OrderListSubmission {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'OrderListTemplate',
    required: true,
    index: true,
  })
  orderListTemplateId: Types.ObjectId;

  @Prop({ required: true, maxlength: 150 })
  templateTitle: string;

  @Prop({ required: true, maxlength: 100 })
  jobSite: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [OrderListEntryValue], default: [] })
  entries: OrderListEntryValue[];

  // Not @Prop-decorated — added by { timestamps: true }; declared so TS knows about it.
  createdAt: Date;
}

export const OrderListSubmissionSchema =
  SchemaFactory.createForClass(OrderListSubmission);

OrderListSubmissionSchema.index({ organizationId: 1, createdAt: -1 });
