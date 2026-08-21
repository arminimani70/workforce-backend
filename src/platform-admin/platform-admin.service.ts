import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  PlatformAdmin,
  PlatformAdminDocument,
} from './schemas/platform-admin.schema';
import { PlatformAdminLoginDto } from './dto/platform-admin-login.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../billing/plans.service';

const SALT_ROUNDS = 10;

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    @InjectModel(PlatformAdmin.name)
    private readonly platformAdminModel: Model<PlatformAdminDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly plansService: PlansService,
  ) {}

  // There's normally exactly one platform admin — you. Rather than a manual DB insert, boot
  // creates it from env vars the first time (a no-op on every later boot once it exists).
  async onModuleInit() {
    const existing = await this.platformAdminModel.findOne();
    if (existing) return;

    const email = this.configService.get<string>('PLATFORM_ADMIN_EMAIL');
    const password = this.configService.get<string>('PLATFORM_ADMIN_PASSWORD');
    if (!email || !password) return;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.platformAdminModel.create({ email, passwordHash });
    this.logger.log(`Bootstrapped platform admin account for ${email}`);
  }

  async login(dto: PlatformAdminLoginDto): Promise<{ accessToken: string }> {
    // The schema lowercases email on save; match that here so a login typed with different
    // casing than the bootstrap env var still finds the account.
    const admin = await this.platformAdminModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+passwordHash');
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign(
      { sub: admin._id.toString(), email: admin.email },
      {
        secret: this.configService.getOrThrow<string>(
          'PLATFORM_ADMIN_JWT_SECRET',
        ),
        expiresIn: '12h',
      },
    );
    return { accessToken };
  }

  // Every tenant with its seat usage and subscription state — the super-admin panel's org list.
  async listOrganizations() {
    const organizations = await this.organizationsService.findAll();
    return Promise.all(
      organizations.map(async (org) => {
        const members = await this.usersService.findAllInOrg(
          org._id.toString(),
        );
        const owner = org.ownerId
          ? members.find((m) => m._id.toString() === org.ownerId!.toString())
          : undefined;
        return {
          _id: org._id,
          name: org.name,
          industry: org.industry,
          subscriptionStatus: org.subscriptionStatus,
          planId: org.planId,
          seatLimit: org.seatLimit,
          memberCount: members.length,
          ownerName: owner?.fullName,
          ownerEmail: owner?.email,
          currentPeriodEnd: org.currentPeriodEnd,
          createdAt: org.createdAt,
        };
      }),
    );
  }

  listPlans() {
    return this.plansService.findAll();
  }

  updatePlan(key: string, dto: UpdatePlanDto) {
    return this.plansService.update(key, dto);
  }

  updateOrganization(organizationId: string, dto: UpdateOrganizationDto) {
    return this.organizationsService.adminUpdate(organizationId, dto);
  }
}
