import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FormTemplate,
  FormTemplateSchema,
} from './schemas/form-template.schema';
import {
  FormSubmission,
  FormSubmissionSchema,
} from './schemas/form-submission.schema';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FormTemplate.name, schema: FormTemplateSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
    ]),
  ],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
