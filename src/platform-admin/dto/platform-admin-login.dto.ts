import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PlatformAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
