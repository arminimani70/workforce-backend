import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

  findForEmployee(organizationId: string, employeeId: string) {
    return this.shiftModel
      .find({ organizationId, employeeId })
      .sort({ startTime: 1 });
  }

  findAllForOrg(organizationId: string) {
    return this.shiftModel.find({ organizationId }).sort({ startTime: 1 });
  }
}
