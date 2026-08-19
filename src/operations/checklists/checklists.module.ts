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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChecklistTemplate.name, schema: ChecklistTemplateSchema },
      { name: ChecklistCompletion.name, schema: ChecklistCompletionSchema },
    ]),
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
