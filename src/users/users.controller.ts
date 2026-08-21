import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from './schemas/user.schema';
import { UsersService, toPublicUser } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { OrganizationsService } from '../organizations/organizations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch('me/password')
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
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
    const currentMembers = await this.usersService.findAllInOrg(
      user.organizationId,
    );
    await this.organizationsService.assertSeatAvailable(
      user.organizationId,
      currentMembers.length,
    );

    const created = await this.usersService.create({
      organizationId: user.organizationId,
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
    });
    return toPublicUser(created);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const updated = await this.usersService.updateEmployee(
      user.organizationId,
      id,
      dto,
    );
    return toPublicUser(updated);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.usersService.deleteEmployee(
      user.organizationId,
      id,
      user.userId,
    );
    return { success: true };
  }
}
