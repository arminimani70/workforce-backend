import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserRole } from '../schemas/user.schema';

// Owner/manager creating a new team member directly — no self-registration flow, so the
// caller sets a temporary password. role is restricted to employee/manager, same as
// UpdateEmployeeDto — the organization owner is only ever set once, at registration.
export class CreateEmployeeDto {
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn([UserRole.EMPLOYEE, UserRole.MANAGER])
  role?: UserRole;
}
