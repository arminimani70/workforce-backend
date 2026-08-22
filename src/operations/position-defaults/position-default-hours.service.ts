import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PositionDefaultHours,
  PositionDefaultHoursDocument,
} from './schemas/position-default-hours.schema';
import { UpsertPositionDefaultHoursDto } from './dto/upsert-position-default-hours.dto';

@Injectable()
export class PositionDefaultHoursService {
  constructor(
    @InjectModel(PositionDefaultHours.name)
    private readonly model: Model<PositionDefaultHoursDocument>,
  ) {}

  // Any authenticated user — Availability reads these to prefill start/end time per position.
  listForOrg(organizationId: string) {
    return this.model.find({ organizationId });
  }

  // Owner/manager only. One position at a time, upserted — there's no "delete", just overwrite;
  // a position with no document set yet simply falls back to the app's hardcoded 09:00-17:00.
  upsert(organizationId: string, dto: UpsertPositionDefaultHoursDto) {
    return this.model.findOneAndUpdate(
      { organizationId, position: dto.position },
      { startTime: dto.startTime, endTime: dto.endTime },
      { upsert: true, returnDocument: 'after' },
    );
  }
}
