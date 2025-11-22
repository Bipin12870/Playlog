import { Stack } from 'expo-router';

import { GameDetailsCacheProvider } from '../lib/hooks/useGameDetailsCache';
import { DiscoveryCacheProvider } from '../lib/hooks/useDiscoveryCache';
import { ThemeProvider, useTheme } from '../lib/theme';

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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GameDetailsCacheProvider>
        <DiscoveryCacheProvider>
          <ThemedRootStack />
        </DiscoveryCacheProvider>
      </GameDetailsCacheProvider>
    </ThemeProvider>
  );
}
