import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
  AvailabilityStatus,
} from './schemas/availability.schema';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  // Every date the caller has set a preference for within the range — a date with no document
  // simply hasn't been touched yet.
  getMine(organizationId: string, employeeId: string, from: Date, to: Date) {
    return this.availabilityModel
      .find({ organizationId, employeeId, date: { $gte: from, $lte: to } })
      .sort({ date: 1 });
  }

  upsertMine(
    organizationId: string,
    employeeId: string,
    dto: UpdateAvailabilityDto,
  ) {
    const isAvailable = dto.status === AvailabilityStatus.AVAILABLE;
    return this.availabilityModel.findOneAndUpdate(
      { organizationId, employeeId, date: dto.date },
      {
        organizationId,
        employeeId,
        date: dto.date,
        status: dto.status,
        startTime: isAvailable ? dto.startTime : undefined,
        endTime: isAvailable ? dto.endTime : undefined,
        positions: isAvailable ? (dto.positions ?? []) : [],
      },
      { upsert: true, new: true },
    );
  }

  // Resets a date back to "not set" rather than leaving it pinned on some status.
  deleteMine(organizationId: string, employeeId: string, date: Date) {
    return this.availabilityModel.deleteOne({
      organizationId,
      employeeId,
      date,
    });
  }

  // Org-wide, owner/manager only — every entry in the range, for the week-builder to
  // cross-reference who marked themselves available against the exact date being built.
  findAllForOrg(organizationId: string, from: Date, to: Date) {
    return this.availabilityModel
      .find({ organizationId, date: { $gte: from, $lte: to } })
      .populate('employeeId', 'fullName role')
      .sort({ date: 1 });
  }
}
