import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
  DayAvailabilityStatus,
} from './schemas/availability.schema';
import { DayAvailabilityDto } from './dto/update-availability.dto';

function defaultDays(): DayAvailabilityDto[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    status: DayAvailabilityStatus.UNAVAILABLE,
    positions: [],
  }));
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async getMine(organizationId: string, employeeId: string) {
    const existing = await this.availabilityModel.findOne({
      organizationId,
      employeeId,
    });
    return existing ?? { organizationId, employeeId, days: defaultDays() };
  }

  upsertMine(
    organizationId: string,
    employeeId: string,
    days: DayAvailabilityDto[],
  ) {
    return this.availabilityModel.findOneAndUpdate(
      { organizationId, employeeId },
      { organizationId, employeeId, days },
      { upsert: true, new: true },
    );
  }
}
