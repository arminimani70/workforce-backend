import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChecklistTemplate,
  ChecklistTemplateSchema,
} from './schemas/checklist-template.schema';
import {
  ChecklistCompletion,
  ChecklistCompletionDocument,
  ChecklistCompletionSchema,
} from './schemas/checklist-completion.schema';
import {
  ChecklistSubmission,
  ChecklistSubmissionSchema,
} from './schemas/checklist-submission.schema';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';

// ChecklistCompletion was originally keyed one-document-per-shift, with a unique index on
// { organizationId, shiftId }. The schema has since moved through two redesigns to one shared
// document per (position, jobSite), with no shiftId field at all — but Mongoose's default index
// sync only *adds* indexes declared on the schema, it never drops ones no longer declared. That
// stale unique index survives in already-deployed databases and rejects the second-ever
// completion document for any organization (both now missing shiftId, so both index as null) with
// an E11000 duplicate key error. syncIndexes() reconciles the live collection to exactly what the
// schema declares, dropping stale indexes too — same fix as AvailabilityModule's.
@Injectable()
class ChecklistCompletionIndexSync implements OnModuleInit {
  constructor(
    @InjectModel(ChecklistCompletion.name)
    private readonly completionModel: Model<ChecklistCompletionDocument>,
  ) {}

  async onModuleInit() {
    await this.completionModel.syncIndexes();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChecklistTemplate.name, schema: ChecklistTemplateSchema },
      { name: ChecklistCompletion.name, schema: ChecklistCompletionSchema },
      { name: ChecklistSubmission.name, schema: ChecklistSubmissionSchema },
    ]),
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService, ChecklistCompletionIndexSync],
})
export class ChecklistsModule {}
