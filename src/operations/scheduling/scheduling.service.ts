import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
  ) {}

  create(organizationId: string, createdBy: string, dto: CreateShiftDto) {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    return this.shiftModel.create({
      organizationId,
      createdBy,
      employeeId: dto.employeeId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      jobSite: dto.jobSite,
      position: dto.position,
    });
  }

  findForEmployee(
    organizationId: string,
    employeeId: string,
    options: { from?: Date; to?: Date; confirmedOnly?: boolean } = {},
  ) {
    const filter: QueryFilter<ShiftDocument> = { organizationId, employeeId };
    if (options.from || options.to) {
      filter.startTime = {
        ...(options.from && { $gte: options.from }),
        ...(options.to && { $lte: options.to }),
      };
    }
    if (options.confirmedOnly) {
      filter.confirmed = true;
    }
    return this.shiftModel.find(filter).sort({ startTime: 1 });
  }

  findAllForOrg(organizationId: string) {
    return this.shiftModel.find({ organizationId }).sort({ startTime: 1 });
  }

  // Every confirmed shift in the org starting in [from, to], with the employee's name/role
  // populated — this is what powers "who else is working today" for any authenticated user,
  // not just owner/manager. Takes the exact window rather than a bare date so the caller's
  // local-timezone day boundaries are used instead of the server's.
  findCoworkersInRange(organizationId: string, from: Date, to: Date) {
    return this.shiftModel
      .find({
        organizationId,
        confirmed: true,
        startTime: { $gte: from, $lte: to },
      })
      .populate('employeeId', 'fullName role')
      .sort({ startTime: 1 });
  }

  async confirm(organizationId: string, shiftId: string) {
    if (!isValidObjectId(shiftId)) {
      throw new NotFoundException('Shift not found');
    }

    const shift = await this.shiftModel.findOneAndUpdate(
      { _id: shiftId, organizationId },
      { confirmed: true },
      { new: true },
    );
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }
}
