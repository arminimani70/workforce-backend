import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockTemplateDocument = HydratedDocument<StockTemplate>;

@Schema({ _id: false })
export class StockItem {
  @Prop({ required: true, maxlength: 150 })
  productName: string;

  @Prop({ required: true, maxlength: 50 })
  unit: string;
}

// A manager-built, named list of products to count at one branch (e.g. "Bar Stock", "Kitchen
// Stock") — jobSite is a plain-text branch-name snapshot, same convention as Shift.jobSite.
// The manager only fills in productName/unit per row; the employee filling out a submission
// only ever enters a quantity against each of these predefined rows.
@Schema({ timestamps: true })
export class StockTemplate {
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

  @Prop({ type: [StockItem], default: [] })
  items: StockItem[];
}

export const StockTemplateSchema = SchemaFactory.createForClass(StockTemplate);

// No two lists at the same branch share a name.
StockTemplateSchema.index(
  { organizationId: 1, jobSite: 1, title: 1 },
  { unique: true },
);
