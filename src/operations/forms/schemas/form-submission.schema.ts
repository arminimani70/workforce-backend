import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FormSubmissionDocument = HydratedDocument<FormSubmission>;

@Schema({ _id: false })
class FormFieldValue {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  value: string;
}

// One per submitted form — stores a label+value snapshot for each field rather than a
// reference to the template's field list, so a submission stays readable even if the
// template is edited or a field removed later.
@Schema({ timestamps: true })
export class FormSubmission {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'FormTemplate',
    required: true,
    index: true,
  })
  formTemplateId: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  formTitle: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [FormFieldValue], default: [] })
  values: FormFieldValue[];

  // Not @Prop-decorated — added by { timestamps: true } at the schema level; declared here
  // only so TS knows about it where code reads submission.createdAt.
  createdAt: Date;
}

export const FormSubmissionSchema =
  SchemaFactory.createForClass(FormSubmission);

FormSubmissionSchema.index({ organizationId: 1, createdAt: -1 });
