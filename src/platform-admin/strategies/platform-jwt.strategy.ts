import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface PlatformAdminJwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedPlatformAdmin {
  platformAdminId: string;
  email: string;
}

// Registered under the 'platform-jwt' name (not the default 'jwt') and keyed by its own
// secret — entirely separate from the org-user JwtStrategy, on purpose.
@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>(
        'PLATFORM_ADMIN_JWT_SECRET',
      ),
    });
  }

  validate(payload: PlatformAdminJwtPayload): AuthenticatedPlatformAdmin {
    return { platformAdminId: payload.sub, email: payload.email };
  }
}
