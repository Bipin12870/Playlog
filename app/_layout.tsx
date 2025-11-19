import { Stack } from 'expo-router';

import { GameDetailsCacheProvider } from '../lib/hooks/useGameDetailsCache';
import { DiscoveryCacheProvider } from '../lib/hooks/useDiscoveryCache';

export default function RootLayout() {
  return (
    <GameDetailsCacheProvider>
      <DiscoveryCacheProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f172a' },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="game/[id]" />
          <Stack.Screen name="search-history" />
        </Stack>
      </DiscoveryCacheProvider>
    </GameDetailsCacheProvider>
  );
}
