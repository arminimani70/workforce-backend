import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// First user of a brand-new organization: creates the Organization and the Owner in one call.
export class RegisterDto {
  @IsNotEmpty()
  organizationName: string;

  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
