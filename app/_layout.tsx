import { Stack } from 'expo-router';
import { type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession(); // <-- MUST be at module scope
import { GameDetailsCacheProvider } from '../lib/hooks/useGameDetailsCache';
import { DiscoveryCacheProvider } from '../lib/hooks/useDiscoveryCache';
import { ThemeProvider, useTheme } from '../lib/theme';
import { useIsMobileWeb } from '../lib/hooks/useIsMobileWeb';
import { MobileWebNotice } from '../components/MobileWebNotice';

function ThemedRootStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="game/[id]" />
      <Stack.Screen name="search-history" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

function MobileWebGate({ children }: { children: ReactNode }) {
  const isMobileWeb = useIsMobileWeb();
  if (isMobileWeb) {
    return <MobileWebNotice />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MobileWebGate>
        <GameDetailsCacheProvider>
          <DiscoveryCacheProvider>
            <ThemedRootStack />
          </DiscoveryCacheProvider>
        </GameDetailsCacheProvider>
      </MobileWebGate>
    </ThemeProvider>
  );
}
