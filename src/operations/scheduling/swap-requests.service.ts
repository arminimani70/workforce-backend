import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Shift, ShiftApproval, ShiftDocument } from './schemas/shift.schema';
import {
  ShiftSwapRequest,
  ShiftSwapRequestDocument,
  SwapRequestStatus,
} from './schemas/shift-swap-request.schema';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@Injectable()
export class SwapRequestsService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftSwapRequest.name)
    private readonly swapRequestModel: Model<ShiftSwapRequestDocument>,
  ) {}

  async create(
    organizationId: string,
    requestingEmployeeId: string,
    dto: CreateSwapRequestDto,
  ) {
    if (dto.requestingShiftId === dto.targetShiftId) {
      throw new BadRequestException('Cannot swap a shift with itself');
    }

    const [requestingShift, targetShift] = await Promise.all([
      this.shiftModel.findOne({ _id: dto.requestingShiftId, organizationId }),
      this.shiftModel.findOne({ _id: dto.targetShiftId, organizationId }),
    ]);
    if (!requestingShift || !targetShift) {
      throw new NotFoundException('Shift not found');
    }
    if (requestingShift.employeeId.toString() !== requestingEmployeeId) {
      throw new ForbiddenException('You can only offer your own shift');
    }
    if (targetShift.employeeId.toString() === requestingEmployeeId) {
      throw new BadRequestException('Cannot request a swap with yourself');
    }
    if (
      requestingShift.approval !== ShiftApproval.APPROVED ||
      targetShift.approval !== ShiftApproval.APPROVED
    ) {
      throw new BadRequestException(
        'Both shifts must be approved to request a swap',
      );
    }

    return this.swapRequestModel.create({
      organizationId,
      requestingShiftId: requestingShift._id,
      requestingEmployeeId,
      targetShiftId: targetShift._id,
      targetEmployeeId: targetShift.employeeId,
    });
  }

  // Every request the caller is involved in, either side — powers both "requests I sent" and
  // "requests waiting on me to respond" from one call.
  findMine(organizationId: string, employeeId: string) {
    return this.swapRequestModel
      .find({
        organizationId,
        $or: [
          { requestingEmployeeId: employeeId },
          { targetEmployeeId: employeeId },
        ],
      })
      .populate('requestingEmployeeId', 'fullName role')
      .populate('targetEmployeeId', 'fullName role')
      .populate('requestingShiftId')
      .populate('targetShiftId')
      .sort({ createdAt: -1 });
  }

  // Org-wide, owner/manager only — every request both sides have already agreed to and that's
  // now waiting on a manager's final approval.
  findPendingManagerForOrg(organizationId: string) {
    return this.swapRequestModel
      .find({ organizationId, status: SwapRequestStatus.PENDING_MANAGER })
      .populate('requestingEmployeeId', 'fullName role')
      .populate('targetEmployeeId', 'fullName role')
      .populate('requestingShiftId')
      .populate('targetShiftId')
      .sort({ createdAt: -1 });
  }

  private async findOwnedRequest(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Swap request not found');
    }
    const request = await this.swapRequestModel.findOne({
      _id: id,
      organizationId,
    });
    if (!request) {
      throw new NotFoundException('Swap request not found');
    }
    return request;
  }

  async accept(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.targetEmployeeId.toString() !== employeeId) {
      throw new ForbiddenException(
        'Only the target employee can accept this request',
      );
    }
    if (request.status !== SwapRequestStatus.PENDING_TARGET) {
      throw new BadRequestException(
        'This request is no longer pending your response',
      );
    }
    request.status = SwapRequestStatus.PENDING_MANAGER;
    await request.save();
    return request;
  }

  async decline(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.targetEmployeeId.toString() !== employeeId) {
      throw new ForbiddenException(
        'Only the target employee can decline this request',
      );
    }
    if (request.status !== SwapRequestStatus.PENDING_TARGET) {
      throw new BadRequestException(
        'This request is no longer pending your response',
      );
    }
    request.status = SwapRequestStatus.REJECTED;
    await request.save();
    return request;
  }

  async cancel(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.requestingEmployeeId.toString() !== employeeId) {
      throw new ForbiddenException(
        'Only the requester can cancel this request',
      );
    }
    if (request.status !== SwapRequestStatus.PENDING_TARGET) {
      throw new BadRequestException('This request can no longer be cancelled');
    }
    request.status = SwapRequestStatus.CANCELLED;
    await request.save();
    return request;
  }

  async approve(organizationId: string, id: string, managerId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.status !== SwapRequestStatus.PENDING_MANAGER) {
      throw new BadRequestException(
        'This request is not awaiting manager approval',
      );
    }

    // Swap who's assigned to each shift — everything else about the shift (time, position,
    // jobSite) stays put; only the two employeeId values trade places.
    await Promise.all([
      this.shiftModel.updateOne(
        { _id: request.requestingShiftId },
        { employeeId: request.targetEmployeeId },
      ),
      this.shiftModel.updateOne(
        { _id: request.targetShiftId },
        { employeeId: request.requestingEmployeeId },
      ),
    ]);

    request.status = SwapRequestStatus.APPROVED;
    request.decidedBy = new Types.ObjectId(managerId);
    await request.save();
    return request;
  }

  async deny(organizationId: string, id: string, managerId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.status !== SwapRequestStatus.PENDING_MANAGER) {
      throw new BadRequestException(
        'This request is not awaiting manager approval',
      );
    }
    request.status = SwapRequestStatus.REJECTED;
    request.decidedBy = new Types.ObjectId(managerId);
    await request.save();
    return request;
  }
}
