// Sample tier structure — placeholder pricing (EUR/month) to build the checkout flow against.
// Edit freely once real pricing is decided; nothing else in the codebase hardcodes these
// numbers. Each plan's Lemon Squeezy variant id comes from an env var (not hardcoded here)
// since that id only exists once the product/variant is created in the Lemon Squeezy dashboard.
export interface Plan {
  id: string;
  name: string;
  seatLimit: number;
  priceMonthlyEur: number;
  variantIdEnvVar: string;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    seatLimit: 10,
    priceMonthlyEur: 29,
    variantIdEnvVar: 'LEMONSQUEEZY_VARIANT_STARTER',
  },
  {
    id: 'growth',
    name: 'Growth',
    seatLimit: 25,
    priceMonthlyEur: 69,
    variantIdEnvVar: 'LEMONSQUEEZY_VARIANT_GROWTH',
  },
  {
    id: 'scale',
    name: 'Scale',
    seatLimit: 60,
    priceMonthlyEur: 149,
    variantIdEnvVar: 'LEMONSQUEEZY_VARIANT_SCALE',
  },
];

export function findPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}
