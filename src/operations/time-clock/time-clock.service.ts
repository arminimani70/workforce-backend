import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  TimeClockEntry,
  TimeClockEntryDocument,
} from './schemas/time-clock-entry.schema';
import { ClockLocationDto } from './dto/clock-location.dto';

function toGeoPoint(dto: ClockLocationDto) {
  return dto.lat !== undefined && dto.lng !== undefined
    ? { lat: dto.lat, lng: dto.lng }
    : undefined;
}

@Injectable()
export class TimeClockService {
  constructor(
    @InjectModel(TimeClockEntry.name)
    private readonly entryModel: Model<TimeClockEntryDocument>,
  ) {}

  private findOpenEntry(organizationId: string, employeeId: string) {
    return this.entryModel.findOne({
      organizationId,
      employeeId,
      clockOutTime: { $exists: false },
    });
  }

  async clockIn(
    organizationId: string,
    employeeId: string,
    location: ClockLocationDto,
  ) {
    const openEntry = await this.findOpenEntry(organizationId, employeeId);
    if (openEntry) {
      throw new ConflictException('Already clocked in');
    }

    return this.entryModel.create({
      organizationId,
      employeeId,
      clockInTime: new Date(),
      clockInLocation: toGeoPoint(location),
    });
  }

  async clockOut(
    organizationId: string,
    employeeId: string,
    location: ClockLocationDto,
  ) {
    const openEntry = await this.findOpenEntry(organizationId, employeeId);
    if (!openEntry) {
      throw new NotFoundException('Not currently clocked in');
    }

    openEntry.clockOutTime = new Date();
    const geoPoint = toGeoPoint(location);
    if (geoPoint) {
      openEntry.clockOutLocation = geoPoint;
    }
    return openEntry.save();
  }

  getStatus(organizationId: string, employeeId: string) {
    return this.findOpenEntry(organizationId, employeeId);
  }

  getHistory(organizationId: string, employeeId: string, limit = 20) {
    return this.entryModel
      .find({ organizationId, employeeId })
      .sort({ clockInTime: -1 })
      .limit(limit);
  }

  // Sums (clockOutTime ?? now) - clockInTime for every entry that *started* in [from, to],
  // so a currently open entry counts toward the total up to this instant.
  async getTotalDuration(
    organizationId: string,
    employeeId: string,
    from?: Date,
    to?: Date,
  ) {
    const filter: QueryFilter<TimeClockEntryDocument> = {
      organizationId,
      employeeId,
    };
    if (from || to) {
      filter.clockInTime = {
        ...(from && { $gte: from }),
        ...(to && { $lte: to }),
      };
    }

    const entries = await this.entryModel.find(filter);
    const now = new Date();
    const totalMs = entries.reduce((sum, entry) => {
      const end = entry.clockOutTime ?? now;
      return sum + (end.getTime() - entry.clockInTime.getTime());
    }, 0);

    return { totalSeconds: Math.round(totalMs / 1000) };
  }
}
