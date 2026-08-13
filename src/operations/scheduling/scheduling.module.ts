import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shift, ShiftSchema } from './schemas/shift.schema';
import {
  ShiftSwapRequest,
  ShiftSwapRequestSchema,
} from './schemas/shift-swap-request.schema';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SwapRequestsService } from './swap-requests.service';
import { SwapRequestsController } from './swap-requests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: ShiftSwapRequest.name, schema: ShiftSwapRequestSchema },
    ]),
  ],
  controllers: [SchedulingController, SwapRequestsController],
  providers: [SchedulingService, SwapRequestsService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
