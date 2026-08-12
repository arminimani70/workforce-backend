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
