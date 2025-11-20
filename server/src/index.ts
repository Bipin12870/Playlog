import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import admin from 'firebase-admin';

import { PLAN_PRICE_MAP, type PlanId } from '../../shared/plans';
import path from 'path';


dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SUCCESS_URL =
  process.env.STRIPE_SUCCESS_URL ??
  'https://example.com/stripe-success?session_id={CHECKOUT_SESSION_ID}';
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL ?? 'https://example.com/stripe-cancel';

if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY. Set this in your billing backend environment.');
}

// IMPORTANT: let Stripe use its default API version from your account.
// This avoids the "2023-11-15" vs "2025-11-17.clover" type error.
const stripe = new Stripe(STRIPE_SECRET_KEY, {});


const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

const firebaseCredential = serviceAccountPath
  ? admin.credential.cert(path.resolve(serviceAccountPath))
  : admin.credential.applicationDefault();

const firebaseApp =
  admin.apps.length === 0
    ? admin.initializeApp({ credential: firebaseCredential })
    : admin.app();
const db = firebaseApp.firestore();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());

class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

type CreateCheckoutSessionRequest = {
  planId?: PlanId;
};

type SubscriptionPayload = {
  premium: boolean;
  subscriptionStatus: string;
  planId: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: number | null;
};

app.post(
  '/stripe/create-checkout-session',
  express.json(),
  async (req: Request<{}, {}, CreateCheckoutSessionRequest>, res: Response, next: NextFunction) => {
    try {
      const planId = req.body.planId;

      // Only PREMIUM is billable. FREE should never go through Stripe.
      if (planId !== 'PREMIUM') {
        throw new ApiError('Invalid or non-billable planId provided', 400);
      }

      const priceId = PLAN_PRICE_MAP.PREMIUM;

      const uid = await resolveAuthUid(req);
      const userRef = db.collection('users').doc(uid);
      const userSnapshot = await userRef.get();
      const existingCustomerId = userSnapshot.data()?.stripeCustomerId;
      const customerEmail = userSnapshot.data()?.email ?? undefined;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: STRIPE_SUCCESS_URL,
        cancel_url: STRIPE_CANCEL_URL,
        client_reference_id: uid,
        customer: existingCustomerId ?? undefined,
        customer_email: customerEmail,
        subscription_data: {
          metadata: {
            planId,
            uid,
          },
        },
        metadata: {
          planId,
          uid,
        },
      });

      return res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.warn('Skipping webhook processing: STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret missing');
    }

    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      console.warn('Webhook missing signature header');
      return res.status(400).send('Missing signature');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.warn('Failed to validate Stripe webhook', error);
      return res.status(400).send('Webhook verification failed');
    }

    try {
      await handleStripeEvent(event);
    } catch (error) {
      console.error('Failed to handle Stripe webhook event', error);
      // Return success so Stripe stops retrying; look up logs to fix the issue.
    }
    return res.status(200).send('Received');
  },
);

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoiceSucceeded(event.data.object as any);
      break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object as any);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionUpdated(event.data.object as any);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as any);
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;
  const planIdFromMetadataRaw =
    typeof session.metadata?.planId === 'string' ? session.metadata.planId : null;
  if (planIdFromMetadataRaw && planIdFromMetadataRaw !== 'PREMIUM') {
    console.warn('Checkout session referenced an unexpected plan id', planIdFromMetadataRaw);
  }
  const uidFromMetadata = typeof session.metadata?.uid === 'string' ? session.metadata.uid : null;
  const uid = uidFromMetadata ?? (customerId ? await findUidByCustomerId(customerId) : null);

  if (!uid) {
    console.warn('Checkout session could not be matched to a user', session.id);
    return;
  }

  await updateUserSubscription(uid, {
    premium: true,
    subscriptionStatus: 'active',
    planId: 'PREMIUM',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: null,
  });
}

async function handleInvoiceSucceeded(invoice: any) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const planId = resolvePlanIdFromInvoice(invoice) ?? 'PREMIUM';
  const uid =
    (await findUidBySubscriptionId(subscriptionId)) ??
    (customerId ? await findUidByCustomerId(customerId) : null);

  if (!uid) {
    console.warn('Invoice event could not be matched to a user', invoice.id);
    return;
  }

  await updateUserSubscription(uid, {
    premium: true,
    subscriptionStatus: 'active',
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: invoice.current_period_end ? invoice.current_period_end * 1000 : null,
  });
}

async function handleInvoiceFailed(invoice: any) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const uid =
    (await findUidBySubscriptionId(subscriptionId)) ??
    (customerId ? await findUidByCustomerId(customerId) : null);

  if (!uid) {
    console.warn('Invoice failure event could not be matched to a user', invoice.id);
    return;
  }

  await updateUserSubscription(uid, {
    premium: false,
    subscriptionStatus: 'past_due',
    planId: 'FREE',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: invoice.current_period_end ? invoice.current_period_end * 1000 : null,
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const subscriptionId = subscription.id;
  const uid =
    (await findUidBySubscriptionId(subscriptionId)) ??
    (customerId ? await findUidByCustomerId(customerId) : null);

  if (!uid) {
    console.warn('Subscription update could not be matched to a user', subscriptionId);
    return;
  }

  const isPremium = shouldTreatAsPremium(subscription.status);
  const planId: PlanId = isPremium ? 'PREMIUM' : 'FREE';
  await updateUserSubscription(uid, {
    premium: isPremium,
    subscriptionStatus: subscription.status,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: subscription.current_period_end
      ? subscription.current_period_end * 1000
      : null,
  });
}

function resolvePlanIdFromInvoice(invoice: any): PlanId | null {
  const priceId = invoice.lines?.data?.[0]?.price?.id ?? null;
  if (!priceId) {
    return null;
  }
  return resolvePlanIdFromPriceId(priceId);
}

function resolvePlanIdFromPriceId(priceId: string): PlanId | null {
  const entry = Object.entries(PLAN_PRICE_MAP).find(([, mappedPriceId]) => mappedPriceId === priceId);
  return entry ? (entry[0] as PlanId) : null;
}

function shouldTreatAsPremium(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

async function updateUserSubscription(uid: string, payload: SubscriptionPayload) {
  const userRef = db.collection('users').doc(uid);
  await userRef.set(
    {
      premium: payload.premium,
      subscriptionStatus: payload.subscriptionStatus,
      planId: payload.planId,
      currentPlanId: payload.planId,
      stripeCustomerId: payload.stripeCustomerId,
      stripeSubscriptionId: payload.stripeSubscriptionId,
      currentPeriodEnd: payload.currentPeriodEnd,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function resolveAuthUid(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Authorization header missing', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = await admin.auth().verifyIdToken(token);
  if (!decoded.uid) {
    throw new ApiError('Unable to resolve user from token', 401);
  }
  return decoded.uid;
}

async function findUidByCustomerId(customerId: string): Promise<string | null> {
  const snapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].id;
}

async function findUidBySubscriptionId(subscriptionId: string | null): Promise<string | null> {
  if (!subscriptionId) {
    return null;
  }
  const snapshot = await db
    .collection('users')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].id;
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Billing server error:', err);
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Billing server listening on port ${port}`);
});