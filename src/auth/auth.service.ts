import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
}

// @nestjs/jwt narrows expiresIn to ms.StringValue; ConfigService only knows plain string.
function asExpiresIn(value: string): JwtSignOptions['expiresIn'] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return value as any;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const organization = await this.organizationsService.create(
      dto.organizationName,
    );

    const user = await this.usersService.create({
      organizationId: organization._id,
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      role: UserRole.OWNER,
    });

    await this.organizationsService.setOwner(organization._id, user._id);

    return this.issueTokens({
      sub: user._id.toString(),
      organizationId: organization._id.toString(),
      role: user.role,
    });
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens({
      sub: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Re-read the user so a role change or suspension takes effect immediately, instead of trusting stale claims.
    const user = await this.usersService.findById(payload.sub);

    return this.issueTokens({
      sub: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });
  }

  private issueTokens(payload: JwtPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: asExpiresIn(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      ),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: asExpiresIn(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      ),
    });
    return { accessToken, refreshToken };
  }
}
