import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { findPlan, PLANS } from './plans';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { SubscriptionStatus } from '../organizations/schemas/organization.schema';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1/checkouts';

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { organization_id?: string };
  };
  data: {
    attributes: {
      status: string;
      variant_id: number;
      customer_id: number;
      renews_at?: string;
      ends_at?: string;
    };
    id: string;
  };
}

// Lemon Squeezy status strings -> our own SubscriptionStatus. "on_trial" from Lemon Squeezy is
// their own trial concept (unused here — we run our own pre-payment trial via
// Organization.subscriptionStatus defaulting to TRIALING), so it maps to ACTIVE: the org paid.
const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  on_trial: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  unpaid: SubscriptionStatus.PAST_DUE,
  cancelled: SubscriptionStatus.CANCELED,
  expired: SubscriptionStatus.CANCELED,
  paused: SubscriptionStatus.CANCELED,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
  ) {}

  getPlans() {
    return PLANS.map(({ id, name, seatLimit, priceMonthlyEur }) => ({
      id,
      name,
      seatLimit,
      priceMonthlyEur,
    }));
  }

  // Owner clicks "Upgrade" on a plan — creates a Lemon Squeezy-hosted checkout pre-filled with
  // their email, carrying the org id through as custom data so the webhook knows which
  // Organization to activate once payment succeeds.
  async createCheckout(
    organizationId: string,
    userId: string,
    planId: string,
  ): Promise<{ url: string }> {
    const plan = findPlan(planId);
    if (!plan) {
      throw new BadRequestException('Unknown plan');
    }
    const variantId = this.configService.get<string>(plan.variantIdEnvVar);
    if (!variantId) {
      throw new InternalServerErrorException(
        `Billing isn't configured for the "${plan.id}" plan yet (missing ${plan.variantIdEnvVar}).`,
      );
    }
    const storeId = this.configService.getOrThrow<string>(
      'LEMONSQUEEZY_STORE_ID',
    );
    const apiKey = this.configService.getOrThrow<string>(
      'LEMONSQUEEZY_API_KEY',
    );
    const appUrl = this.configService.get<string>(
      'ADMIN_APP_URL',
      'http://localhost:3001',
    );
    const user = await this.usersService.findById(userId);

    const response = await fetch(LEMONSQUEEZY_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: { organization_id: organizationId },
            },
            product_options: {
              redirect_url: `${appUrl}/billing/success`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Lemon Squeezy checkout creation failed: ${body}`);
      throw new InternalServerErrorException('Could not start checkout');
    }

    const json = (await response.json()) as {
      data: { attributes: { url: string } };
    };
    return { url: json.data.attributes.url };
  }

  // Verifies the raw request body against Lemon Squeezy's HMAC-SHA256 signature before trusting
  // anything in it — this endpoint has no auth guard (Lemon Squeezy can't hold our JWTs), so the
  // signature is the only thing standing between it and forged subscription events.
  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): void {
    const secret = this.configService.getOrThrow<string>(
      'LEMONSQUEEZY_WEBHOOK_SECRET',
    );
    if (!signatureHeader) {
      throw new BadRequestException('Missing signature');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new BadRequestException('Invalid signature');
    }
  }

  async handleWebhookEvent(payload: LemonSqueezyWebhookPayload): Promise<void> {
    const organizationId = payload.meta.custom_data?.organization_id;
    if (!organizationId) {
      // Not one of our checkouts (or custom data was stripped) — nothing to reconcile.
      this.logger.warn(
        `Webhook event "${payload.meta.event_name}" carried no organization_id`,
      );
      return;
    }

    const { event_name } = payload.meta;
    if (!event_name.startsWith('subscription_')) {
      return;
    }

    const { attributes } = payload.data;
    const status = STATUS_MAP[attributes.status] ?? SubscriptionStatus.PAST_DUE;
    const plan = PLANS.find(
      (p) =>
        this.configService.get<string>(p.variantIdEnvVar) ===
        String(attributes.variant_id),
    );

    try {
      await this.organizationsService.findById(organizationId);
    } catch {
      throw new NotFoundException('Unknown organization in webhook payload');
    }

    await this.organizationsService.updateSubscription(organizationId, {
      subscriptionStatus: status,
      seatLimit:
        status === SubscriptionStatus.ACTIVE ? plan?.seatLimit : undefined,
      planId: plan?.id,
      lemonSqueezyCustomerId: String(attributes.customer_id),
      lemonSqueezySubscriptionId: payload.data.id,
      currentPeriodEnd: attributes.renews_at
        ? new Date(attributes.renews_at)
        : attributes.ends_at
          ? new Date(attributes.ends_at)
          : undefined,
    });
  }
}
