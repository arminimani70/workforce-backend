import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shift, ShiftSchema } from './schemas/shift.schema';
import {
  ShiftSwapRequest,
  ShiftSwapRequestSchema,
} from './schemas/shift-swap-request.schema';
import {
  ShiftEditRequest,
  ShiftEditRequestSchema,
} from './schemas/shift-edit-request.schema';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SwapRequestsService } from './swap-requests.service';
import { SwapRequestsController } from './swap-requests.controller';
import { ShiftEditRequestsService } from './shift-edit-requests.service';
import { ShiftEditRequestsController } from './shift-edit-requests.controller';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: ShiftSwapRequest.name, schema: ShiftSwapRequestSchema },
      { name: ShiftEditRequest.name, schema: ShiftEditRequestSchema },
    ]),
    UsersModule,
  ],
  controllers: [
    SchedulingController,
    SwapRequestsController,
    ShiftEditRequestsController,
  ],
  providers: [SchedulingService, SwapRequestsService, ShiftEditRequestsService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
