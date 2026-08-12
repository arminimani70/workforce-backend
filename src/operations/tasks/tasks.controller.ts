import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskBatchDto } from './dto/create-task-batch.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.organizationId, user.userId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post('batch')
  createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskBatchDto,
  ) {
    return this.tasksService.createBatch(user.organizationId, user.userId, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.findMine(user.organizationId, user.userId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.findAllForOrg(user.organizationId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(
      user.organizationId,
      id,
      { userId: user.userId, role: user.role },
      dto.status,
    );
  }
}
