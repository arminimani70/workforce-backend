import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from './schemas/user.schema';
import { UsersService, toPublicUser } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const members = await this.usersService.findAllInOrg(user.organizationId);
    return members.map(toPublicUser);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    const created = await this.usersService.create({
      organizationId: user.organizationId,
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
    });
    return toPublicUser(created);
  }
}
