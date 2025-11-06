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
     TWITCH_CLIENT_ID=
     TWITCH_CLIENT_SECRET=
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
- `SubscriptionOfferModal` is presentation-only; hook a billing provider or server-driven entitlements into the `onSelectPlan` callback when ready.
- When testing Firestore features, start with relaxed rules during development and tighten them before releasing.

## Roadmap Ideas
- Wire the Friends tab to real social data (currently placeholder copy).
- Replace the static premium modal with actual subscription management and refreshed user claims.
- Add offline caching or optimistic updates for IGDB responses and favourites.
- Expand phone authentication beyond web and AU numbers.
