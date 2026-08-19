import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockSubmissionDocument = HydratedDocument<StockSubmission>;

@Schema({ _id: false })
export class StockEntryValue {
  @Prop({ required: true, maxlength: 150 })
  productName: string;

  @Prop({ required: true, maxlength: 50 })
  unit: string;

  @Prop({ required: true, min: 0 })
  quantity: number;
}

// One per submitted stock count — snapshots the template's title/branch and each row's
// productName/unit alongside the counted quantity, so a submission stays readable even if the
// template is edited or deleted later.
@Schema({ timestamps: true })
export class StockSubmission {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'StockTemplate',
    required: true,
    index: true,
  })
  stockTemplateId: Types.ObjectId;

  @Prop({ required: true, maxlength: 150 })
  templateTitle: string;

  @Prop({ required: true, maxlength: 100 })
  jobSite: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [StockEntryValue], default: [] })
  entries: StockEntryValue[];

  // Not @Prop-decorated — added by { timestamps: true }; declared so TS knows about it.
  createdAt: Date;
}

export const StockSubmissionSchema =
  SchemaFactory.createForClass(StockSubmission);

StockSubmissionSchema.index({ organizationId: 1, createdAt: -1 });
