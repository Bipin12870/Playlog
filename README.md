Playlog

Overview
- React Native + Expo (SDK 54) app scaffolded with TypeScript.
- File‑based navigation powered by Expo Router.
- Bottom tab navigation with four tabs: Home, Favourites, Friends, Profile.
- Basic placeholder screens and Ionicons for tab icons.

Getting Started
1) Requirements
- Node.js 18+ and npm
- iOS: Xcode + Simulator (macOS)
- Android: Android Studio + Emulator
- Expo Go app (optional) for running on device

2) Install
- npm install

3) Run
- Start dev server: npm run start
- Open on iOS: npm run ios
- Open on Android: npm run android
- Open on Web: npm run web

What You Should See
- Web and native show a header with the screen title and a bottom tab bar with four items: Home, Favourites, Friends, Profile.
- The app redirects / to /home on web.

Current Features
- Tabs and routes using Expo Router group layout
  - app/_layout.tsx — root router stack
  - app/(tabs)/_layout.tsx — bottom tabs config (icons, titles)
  - app/(tabs)/home.tsx — Home screen
  - app/(tabs)/fav.tsx — Favourites screen
  - app/(tabs)/friends.tsx — Friends screen
  - app/(tabs)/profile.tsx — Profile screen
- Redirect: app/index.tsx routes to /(tabs)/home

Scripts
- start: expo start
- ios: expo start --ios
- android: expo start --android
- web: expo start --web

Dependencies
- runtime
  - expo ~54.0.9
  - expo-router ~6.0.7
  - @expo/vector-icons ^15.0.2
  - react 19.x, react-native 0.81.x, react-dom 19.x, react-native-web ^0.21.0
  - expo-status-bar ~3.0.8
- dev
  - typescript ~5.9
  - @types/react ~19.1

Key Configuration
- package.json
  - main: expo-router/entry (required for file‑based routing)
- app.json
  - plugins: ["expo-router"]
- tsconfig.json
  - types: ["expo", "expo-router"]
  - baseUrl + paths alias ("@/*" → project root)

Project Structure (relevant)
- app/_layout.tsx
- app/index.tsx
- app/(tabs)/_layout.tsx
- app/(tabs)/home.tsx
- app/(tabs)/fav.tsx
- app/(tabs)/friends.tsx
- app/(tabs)/profile.tsx

Next Steps (planned)
- Firebase setup (Auth + Firestore) for user profiles and play logs.
- IGDB integration for game data (search, trending, details).
- Theming and design polish (light/dark, typography, spacing system).
- State management for tabs and data flows.

Notes
- If tabs don’t appear on web after switching to Expo Router, restart the dev server (stop and run npm run start).
- Ensure @expo/vector-icons is installed and imported as: import { Ionicons } from '@expo/vector-icons'.

