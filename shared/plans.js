"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_PRICE_MAP = exports.PLAN_DETAILS = exports.PLANS = void 0;
exports.PLANS = {
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
};
exports.PLAN_DETAILS = Object.values(exports.PLANS).map((plan) => ({
    ...plan,
    priceId: plan.stripePriceId,
}));
// Replace the placeholder price ID with your actual Stripe Price ID from the Dashboard.
exports.PLAN_PRICE_MAP = {
    PREMIUM: exports.PLANS.PREMIUM.stripePriceId,
};
