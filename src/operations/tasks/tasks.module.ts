import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    SchedulingModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
