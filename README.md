Playlog

Playlog is a cross-platform (web, iOS, Android) game discovery companion built with Expo Router, React Native, and Firebase. It helps players search the IGDB catalog, curate favourites, and share quick community reviews while keeping profile data in sync across devices.

## Feature Highlights
- Game discovery hub that surfaces featured, trending, and AI-recommended games, plus instant search backed by IGDB.
- Full game details view with similar game suggestions, platform highlights, community review stats, and media galleries.
- Community reviews stored in Firestore with live updates, 0-10 ratings, edit/delete support, and per-user limits to prevent spam.
- Favourites synced to each user; free accounts can pin up to 10 titles, while premium accounts (flagged via custom claims) unlock unlimited slots.
- Multi-provider authentication: email/password with verification, Google (Expo Auth Session), and phone sign-up on the web preview with reCAPTCHA, plus password reset and verification resend handling.
- Profile management screen for updating display names, bios, preset avatars or custom URLs, review history, and account sign-out.
- Responsive navigation that adapts between a desktop-navbar experience and native bottom tabs, shared through a single Expo Router codebase.
- Subscription offer modal to upsell premium access and custom claims checks for entitlement-aware UI.

## Architecture & Libraries
- Expo SDK 54 with Expo Router for file-based navigation (stack + tabs).
- React Native 0.81 + React 19 rendered natively and on the web.
- Firebase Authentication and Firestore with transactional username enforcement and real-time subscriptions.
- IGDB data pulled through a Vercel proxy (see `lib/igdb.ts:1`) that exchanges Twitch credentials for app tokens.
- Expo Auth Session, WebBrowser, and Vector Icons for OAuth, deep linking flows, and shared iconography.
- Context-driven hooks (`useAuthUser`, `useGameSearch`, `useGameFavorites`) to keep auth, search, and stateful data accessible across screens.

## Getting Started
1. **Requirements**
   - Node.js 18+ and npm
   - Xcode + iOS Simulator (macOS) for iOS builds
   - Android Studio + Android Emulator
   - Expo Go (optional) for device previews
2. **Install**
   - `npm install`
3. **Environment**
  - Create a `.env` file (gitignored) with the following keys:
    ```
    EXPO_PUBLIC_FIREBASE_API_KEY=
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    EXPO_PUBLIC_FIREBASE_APP_ID=
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
    EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
    EXPO_PUBLIC_PERSPECTIVE_API_KEY=
    TWITCH_CLIENT_ID=
    TWITCH_CLIENT_SECRET=
    EXPO_PUBLIC_BILLING_URL=        # base URL for the billing backend
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Stripe publishable key used by the Expo app
    EXPO_PUBLIC_ENV=development
    STRIPE_PUBLISHABLE_KEY=         # optional duplicate for convenience
    STRIPE_SECRET_KEY=              # used by the billing server
    STRIPE_WEBHOOK_SECRET=          # used by the billing server
    FIREBASE_SERVICE_ACCOUNT_KEY=   # JSON service account; omit if GOOGLE_APPLICATION_CREDENTIALS points to a key file
    STRIPE_SUCCESS_URL=             # optional override for Checkout success
    STRIPE_CANCEL_URL=              # optional override for Checkout cancel
    ```
   - Enable Email/Password, Google, and Phone providers inside Firebase Authentication and add your Expo dev URLs (and production hosts) to the authorized domains list.
   - Configure Firebase phone auth reCAPTCHA (web) and update any required site keys in the Firebase console.
4. **Run**
   - `npm run start` to launch Expo Dev Tools
   - `npm run ios`, `npm run android`, or `npm run web` for platform targets

## Firebase & IGDB Setup Notes
- Firestore collections used in the app include `users`, `usernames`, `gameCommunity`, `userCommunity`, and nested `favorites` collections under each user. Security rules should constrain writes so users can only manage their own data and usernames remain unique.
- Email flows send verification links before allowing profile creation; the app automatically signs users out until verification succeeds.
- Custom claims (`subscriptionActive`, `plan`, or `tier`) unlock unlimited favourites. You can set these via Firebase Admin to simulate premium accounts during development.
- The IGDB proxy currently points at `https://playlog-igdb-proxy-5j9ckofks-bipin12870s-projects.vercel.app/api/igdb`. Fork or redeploy your own proxy and update `API_BASE` in `lib/igdb.ts` if you need different credentials or rate limits.

## Stripe Billing
- The billing backend lives in `server/src/index.ts`. Run `npm run billing:dev` to start it via `ts-node` (it uses `tsconfig.server.json`) and hit the `/stripe/create-checkout-session` and `/stripe/webhook` routes.
- Configure Stripe secrets in your `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and optional `STRIPE_SUCCESS_URL`/`STRIPE_CANCEL_URL`). The server also needs Firestore admin access either from `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON blob) or `GOOGLE_APPLICATION_CREDENTIALS`.
- `src/config/env.ts` centralizes the Expo-side env reads and is imported via `@/config/env` (see `tsconfig.json` path alias) so both the billing client and potential UI components use consistent values.
- Stripe prices are declared in `shared/plans.ts` (the file comments remind you to replace the placeholder price IDs). Those IDs feed both the backend `PLAN_PRICE_MAP` and the UI `SubscriptionOfferModal`.
- The frontend calls `lib/billing.ts` to create checkout sessions, opens the hosted Checkout URL with `Linking.openURL`, and displays the new premium card on the profile tab. Webhooks update Firestore user docs with `premium`, `subscriptionStatus`, `currentPlanId`, `stripeCustomerId`, `stripeSubscriptionId`, and `currentPeriodEnd`, which the UI reads to gate favourites and plan badges.
- The app enforces free vs premium tiers client-side: free users are capped at 10 favourites/reviews, cannot access AI recommendations, and are prompted to upgrade once a limit is hit; the Firestore user doc now stores `planId` (`FREE` or `PREMIUM`) plus the Stripe metadata so the UI can show the right badge and enable premium-only features.
- To exercise the flow locally, run `stripe listen --forward-to http://localhost:4000/stripe/webhook` and use Stripe test cards (like `4242 4242 4242 4242`). The backend logs webhook handling to the console.

## Project Structure (highlights)
- `app/_layout.tsx` - root stack with game details route registration.
- `app/(tabs)/_layout.tsx` - shared tab/web layout, search bar, and providers.
- `app/(tabs)/home.tsx` - discovery grid, IGDB search integration, hero header.
- `app/(tabs)/fav.tsx` - favourites grid with entitlement-aware limits.
- `app/(tabs)/profile.tsx` - profile editing, avatar presets, review management.
- `app/game/[id].tsx` - game details view with community reviews and favourites.
- `app/signup.tsx` + `app/login.tsx` - multi-provider auth flows and subscription upsell.
- `components/home/*` - hero header, discovery sections, search grid, game details UI.
- `lib` - Firebase initialization, auth helpers, IGDB client, community/review logic, and hooks.
- `types/game.ts` - shared IGDB and review typing.

## Development Tips
- Wrap new screens that need game search or favourites state in the provided context providers instead of rolling bespoke data fetches.
- Phone auth currently supports Australian numbers in E.164 format and only runs on the web preview; adjust validation if you expand to other regions.
- `SubscriptionOfferModal` and the profile hero now call the billing backend to create Stripe Checkout sessions while Firestore documents expose the `premium`/plan metadata consumed by the UI (see `shared/plans.ts` and `lib/billing.ts`).
- When testing Firestore features, start with relaxed rules during development and tighten them before releasing.

## Roadmap Ideas
- Wire the Friends tab to real social data (currently placeholder copy).
- Replace the static premium modal with actual subscription management and refreshed user claims.
- Add offline caching or optimistic updates for IGDB responses and favourites.
- Expand phone authentication beyond web and AU numbers.
