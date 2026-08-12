import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskBatchDto } from './dto/create-task-batch.dto';
import { SchedulingService } from '../scheduling/scheduling.service';
import { UserRole } from '../../users/schemas/user.schema';

export interface BatchResult {
  dueDate: string;
  created: boolean;
  reason?: string;
  task?: TaskDocument;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly schedulingService: SchedulingService,
  ) {}

  async create(organizationId: string, createdBy: string, dto: CreateTaskDto) {
    const assignedTo = await this.resolveAssignee(
      organizationId,
      dto.dueDate,
      dto.assignedTo,
      dto.position,
    );

    return this.taskModel.create({
      organizationId,
      createdBy,
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
      assignedTo,
      position: dto.position,
    });
  }

  async createBatch(
    organizationId: string,
    createdBy: string,
    dto: CreateTaskBatchDto,
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (const dueDate of dto.dueDates) {
      const assignedTo =
        await this.schedulingService.findEmployeeForPositionOnDate(
          organizationId,
          dto.position,
          new Date(dueDate),
        );
      if (!assignedTo) {
        results.push({
          dueDate,
          created: false,
          reason: `No one is approved for ${dto.position} on this date`,
        });
        continue;
      }

      const task = await this.taskModel.create({
        organizationId,
        createdBy,
        title: dto.title,
        description: dto.description,
        dueDate,
        assignedTo,
        position: dto.position,
      });
      results.push({ dueDate, created: true, task });
    }
    return results;
  }

  private async resolveAssignee(
    organizationId: string,
    dueDate: string,
    assignedTo?: string,
    position?: CreateTaskDto['position'],
  ): Promise<string> {
    if (assignedTo) {
      return assignedTo;
    }
    if (!position) {
      throw new BadRequestException('Provide either assignedTo or position');
    }
    const resolved = await this.schedulingService.findEmployeeForPositionOnDate(
      organizationId,
      position,
      new Date(dueDate),
    );
    if (!resolved) {
      throw new NotFoundException(
        `No one is approved for ${position} on that date`,
      );
    }
    return resolved;
  }

  findMine(organizationId: string, employeeId: string) {
    return this.taskModel
      .find({ organizationId, assignedTo: employeeId })
      .sort({ dueDate: 1 });
  }

  findAllForOrg(organizationId: string) {
    return this.taskModel
      .find({ organizationId })
      .populate('assignedTo', 'fullName role')
      .sort({ dueDate: 1 });
  }

  async updateStatus(
    organizationId: string,
    taskId: string,
    caller: { userId: string; role: UserRole },
    status: TaskStatus,
  ) {
    if (!isValidObjectId(taskId)) {
      throw new NotFoundException('Task not found');
    }

    const task = await this.taskModel.findOne({ _id: taskId, organizationId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isManager =
      caller.role === UserRole.OWNER || caller.role === UserRole.MANAGER;
    if (!isManager && task.assignedTo.toString() !== caller.userId) {
      throw new ForbiddenException('This task is not assigned to you');
    }

    task.status = status;
    return task.save();
  }
}
