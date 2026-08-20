import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { UserRole, UserStatus } from '../schemas/user.schema';

// Owner/manager editing another team member. role is deliberately restricted to
// employee/manager here — promoting someone to owner isn't something this endpoint does.
export class UpdateEmployeeDto {
  @IsOptional()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn([UserRole.EMPLOYEE, UserRole.MANAGER])
  role?: UserRole;

  @IsOptional()
  @IsIn([UserStatus.ACTIVE, UserStatus.SUSPENDED])
  status?: UserStatus;
}
