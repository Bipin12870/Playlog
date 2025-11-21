export const PLANS = {
  FREE: {
    id: 'FREE',
    stripePriceId: null,
    isSubscription: false,
    title: 'Free tier',
    description: 'Try Playlog at no cost with limited favourites and reviews.',
    priceLabel: '$0',
    billingCycle: 'forever',
  },
  PREMIUM: {
    id: 'PREMIUM',
    stripePriceId: 'price_1SVPVkFQCfP60kzyXfHBNQT9',
    isSubscription: true,
    title: 'Premium',
    description: 'Unlimited favourites, reviews, and access to every premium feature.',
    priceLabel: '$0.5',
    billingCycle: 'per month',
    highlight: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;

type PlanAttributes = {
  id: PlanId;
  stripePriceId: string | null;
  isSubscription: boolean;
  title: string;
  description: string;
  priceLabel: string;
  billingCycle: string;
  highlight?: boolean;
};

export type PlanDetail = PlanAttributes & {
  priceId: string | null;
};

export const PLAN_DETAILS: ReadonlyArray<PlanDetail> = Object.values(PLANS).map((plan) => ({
  ...plan,
  priceId: plan.stripePriceId,
}));

// Replace the placeholder price ID with your actual Stripe Price ID from the Dashboard.
export const PLAN_PRICE_MAP = {
  PREMIUM: PLANS.PREMIUM.stripePriceId!,
} as const;
