import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PositionDefaultHours,
  PositionDefaultHoursSchema,
} from './schemas/position-default-hours.schema';
import { PositionDefaultHoursService } from './position-default-hours.service';
import { PositionDefaultHoursController } from './position-default-hours.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PositionDefaultHours.name, schema: PositionDefaultHoursSchema },
    ]),
  ],
  controllers: [PositionDefaultHoursController],
  providers: [PositionDefaultHoursService],
})
export class PositionDefaultsModule {}
