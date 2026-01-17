import { auth } from './firebase';
import { PLAN_DETAILS, type PlanDetail, type PlanId } from '../shared/plans';
import { BILLING_URL, STRIPE_PUBLISHABLE_KEY } from '../src/config/env';

export type CheckoutSession = {
  url: string;
  sessionId: string;
};

export type BillingPortalSession = {
  url: string;
};

const BASE_URL = BILLING_URL?.replace(/\/+$/, '');

export const stripePublishableKey = STRIPE_PUBLISHABLE_KEY ?? null;

export const billingPlans: ReadonlyArray<PlanDetail> = PLAN_DETAILS.filter(
  (plan) => plan.isSubscription,
);

export const planCatalog: Readonly<Record<PlanId, PlanDetail>> = PLAN_DETAILS.reduce(
  (map, plan) => {
    map[plan.id] = plan;
    return map;
  },
  {} as Record<PlanId, PlanDetail>,
);

export async function createCheckoutSession(planId: PlanId): Promise<CheckoutSession> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_BILLING_URL is not configured.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${BASE_URL}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ planId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create checkout session.');
  }

  const body = (await response.json()) as CheckoutSession;
  if (!body?.url) {
    throw new Error('Checkout session URL missing.');
  }

  return body;
}

// 🔹 New: create billing portal session (for manage / cancel subscription)
export async function createBillingPortalSession(): Promise<BillingPortalSession> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_BILLING_URL is not configured.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${BASE_URL}/stripe/create-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create billing portal session.');
  }

  const body = (await response.json()) as BillingPortalSession;
  if (!body?.url) {
    throw new Error('Billing portal URL missing.');
  }

  return body;
}

export type { PlanDetail, PlanId };
