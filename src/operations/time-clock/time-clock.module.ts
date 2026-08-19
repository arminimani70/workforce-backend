import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TimeClockEntry,
  TimeClockEntrySchema,
} from './schemas/time-clock-entry.schema';
import { TimeClockService } from './time-clock.service';
import { TimeClockController } from './time-clock.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimeClockEntry.name, schema: TimeClockEntrySchema },
    ]),
    SchedulingModule,
  ],
  controllers: [TimeClockController],
  providers: [TimeClockService],
})
export class TimeClockModule {}
