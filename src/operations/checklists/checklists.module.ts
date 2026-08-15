import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChecklistTemplate,
  ChecklistTemplateSchema,
} from './schemas/checklist-template.schema';
import {
  ChecklistCompletion,
  ChecklistCompletionSchema,
} from './schemas/checklist-completion.schema';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChecklistTemplate.name, schema: ChecklistTemplateSchema },
      { name: ChecklistCompletion.name, schema: ChecklistCompletionSchema },
    ]),
    SchedulingModule,
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
