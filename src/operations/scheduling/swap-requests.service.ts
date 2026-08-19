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
import { UsersService, toPublicUser } from '../../users/users.service';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

@Injectable()
export class SwapRequestsService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftSwapRequest.name)
    private readonly swapRequestModel: Model<ShiftSwapRequestDocument>,
    private readonly usersService: UsersService,
  ) {}

  private async findShiftsOnDay(
    organizationId: string,
    day: Date,
    extra: Record<string, unknown> = {},
  ) {
    return this.shiftModel.find({
      organizationId,
      approval: ShiftApproval.APPROVED,
      startTime: { $gte: startOfDay(day), $lte: endOfDay(day) },
      ...extra,
    });
  }

  // Who's eligible to be picked as a direct swap target for this shift: anyone in the same
  // position with an approved shift that day at a *different* branch, or anyone with no shift
  // at all that day. Powers the picker in the "Request Swap" form.
  async findEligibleCandidates(organizationId: string, shiftId: string) {
    if (!isValidObjectId(shiftId)) {
      throw new NotFoundException('Shift not found');
    }
    const shift = await this.shiftModel.findOne({
      _id: shiftId,
      organizationId,
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const [allMembers, dayShifts] = await Promise.all([
      this.usersService.findAllInOrg(organizationId),
      this.findShiftsOnDay(organizationId, shift.startTime),
    ]);

    const dayShiftByEmployee = new Map(
      dayShifts.map((s) => [s.employeeId.toString(), s]),
    );

    return allMembers
      .filter((member) => member._id.toString() !== shift.employeeId.toString())
      .filter((member) => {
        const theirShift = dayShiftByEmployee.get(member._id.toString());
        if (!theirShift) return true; // free that day — always eligible
        return (
          theirShift.position === shift.position &&
          theirShift.jobSite !== shift.jobSite
        );
      })
      .map(toPublicUser);
  }

  async create(
    organizationId: string,
    requestingEmployeeId: string,
    dto: CreateSwapRequestDto,
  ) {
    const requestingShift = await this.shiftModel.findOne({
      _id: dto.requestingShiftId,
      organizationId,
    });
    if (!requestingShift) {
      throw new NotFoundException('Shift not found');
    }
    if (requestingShift.employeeId.toString() !== requestingEmployeeId) {
      throw new ForbiddenException('You can only offer your own shift');
    }
    if (requestingShift.approval !== ShiftApproval.APPROVED) {
      throw new BadRequestException(
        'Your shift must be approved to request a swap',
      );
    }

    if (!dto.targetEmployeeId) {
      return this.swapRequestModel.create({
        organizationId,
        requestingShiftId: requestingShift._id,
        requestingEmployeeId,
        position: requestingShift.position,
        status: SwapRequestStatus.OPEN,
      });
    }

    if (dto.targetEmployeeId === requestingEmployeeId) {
      throw new BadRequestException('Cannot request a swap with yourself');
    }

    const targetShift = await this.shiftModel.findOne({
      organizationId,
      employeeId: dto.targetEmployeeId,
      approval: ShiftApproval.APPROVED,
      startTime: {
        $gte: startOfDay(requestingShift.startTime),
        $lte: endOfDay(requestingShift.startTime),
      },
    });
    if (
      targetShift &&
      (targetShift.position !== requestingShift.position ||
        targetShift.jobSite === requestingShift.jobSite)
    ) {
      throw new BadRequestException(
        'That person is not eligible — they need to be free that day, or working your position at a different branch',
      );
    }

    return this.swapRequestModel.create({
      organizationId,
      requestingShiftId: requestingShift._id,
      requestingEmployeeId,
      position: requestingShift.position,
      targetShiftId: targetShift?._id,
      targetEmployeeId: dto.targetEmployeeId,
      status: SwapRequestStatus.PENDING_TARGET,
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

  // Open ("Free Volunteer") requests the caller is eligible to claim: they have no approved
  // shift on the requesting shift's day. Not position-filtered — anyone free that day can see
  // and volunteer for an open request.
  async findOpenForEmployee(organizationId: string, employeeId: string) {
    const open = await this.swapRequestModel
      .find({ organizationId, status: SwapRequestStatus.OPEN })
      .populate('requestingEmployeeId', 'fullName role')
      .populate('requestingShiftId')
      .sort({ createdAt: -1 });

    const isEligible = await Promise.all(
      open.map(async (request) => {
        const requestingShift =
          request.requestingShiftId as unknown as ShiftDocument;
        if (!requestingShift) return false;
        const myShift = await this.shiftModel.findOne({
          organizationId,
          employeeId,
          approval: ShiftApproval.APPROVED,
          startTime: {
            $gte: startOfDay(requestingShift.startTime),
            $lte: endOfDay(requestingShift.startTime),
          },
        });
        return !myShift;
      }),
    );

    return open.filter((_, index) => isEligible[index]);
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

  // Claiming an open ("Free Volunteer") request is itself the acceptance — it skips
  // pending_target and goes straight to waiting on a manager, same as a direct target
  // accepting.
  async volunteer(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.status !== SwapRequestStatus.OPEN) {
      throw new BadRequestException('This request is no longer open');
    }
    if (request.requestingEmployeeId.toString() === employeeId) {
      throw new BadRequestException('Cannot volunteer for your own request');
    }

    const requestingShift = await this.shiftModel.findOne({
      _id: request.requestingShiftId,
      organizationId,
    });
    if (!requestingShift) {
      throw new NotFoundException('Shift not found');
    }
    const myShift = await this.shiftModel.findOne({
      organizationId,
      employeeId,
      approval: ShiftApproval.APPROVED,
      startTime: {
        $gte: startOfDay(requestingShift.startTime),
        $lte: endOfDay(requestingShift.startTime),
      },
    });
    if (myShift) {
      throw new BadRequestException(
        'You already have a shift that day, so you cannot volunteer',
      );
    }

    request.targetEmployeeId = new Types.ObjectId(employeeId);
    request.status = SwapRequestStatus.PENDING_MANAGER;
    await request.save();
    return request;
  }

  async accept(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.targetEmployeeId?.toString() !== employeeId) {
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
    if (request.targetEmployeeId?.toString() !== employeeId) {
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
    if (
      request.status !== SwapRequestStatus.PENDING_TARGET &&
      request.status !== SwapRequestStatus.OPEN
    ) {
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

    if (request.targetShiftId) {
      // Both sides had a shift that day — swap who's assigned to each; everything else about
      // the shift (time, position, jobSite) stays put.
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
    } else {
      // The target had nothing to trade — just hand the requester's shift over to them.
      await this.shiftModel.updateOne(
        { _id: request.requestingShiftId },
        { employeeId: request.targetEmployeeId },
      );
    }

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
