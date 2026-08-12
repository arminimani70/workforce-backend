import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Owner/manager creating a new team member directly — no self-registration flow, so the
// caller sets a temporary password.
export class CreateEmployeeDto {
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
