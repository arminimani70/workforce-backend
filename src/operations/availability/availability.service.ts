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

const VALID_STATUSES = Object.values(DayAvailabilityStatus) as string[];

// Reshapes whatever is actually stored into today's DayAvailabilityDto shape, dropping any
// stray/legacy fields and defaulting an unrecognized status to unavailable. Without this, data
// saved under a previous schema version (e.g. the old available:boolean field) would come back
// out of GET, get echoed straight into PUT by the client, and fail validation there.
// Typed loosely on purpose: this reads whatever shape is actually stored, which may predate
// the current schema (see comment above).
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
function sanitizeDay(day: any): DayAvailabilityDto {
  const status = VALID_STATUSES.includes(day.status)
    ? (day.status as DayAvailabilityStatus)
    : DayAvailabilityStatus.UNAVAILABLE;
  const isAvailable = status === DayAvailabilityStatus.AVAILABLE;

  return {
    dayOfWeek: day.dayOfWeek,
    status,
    startTime: isAvailable ? day.startTime : undefined,
    endTime: isAvailable ? day.endTime : undefined,
    positions: isAvailable ? (day.positions ?? []) : [],
  };
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async getMine(organizationId: string, employeeId: string) {
    const existing = await this.availabilityModel
      .findOne({ organizationId, employeeId })
      .lean();
    if (!existing) {
      return { organizationId, employeeId, days: defaultDays() };
    }
    return { organizationId, employeeId, days: existing.days.map(sanitizeDay) };
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
