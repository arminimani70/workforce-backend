import { UserRole } from '../../users/schemas/user.schema';

// Shape of req.user after JwtStrategy.validate() — attached by JwtAuthGuard.
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  role: UserRole;
}
