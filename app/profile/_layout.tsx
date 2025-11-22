import { Stack } from 'expo-router';

import { GameFavoritesProvider } from '../../lib/hooks/useGameFavorites';
import { useTheme } from '../../lib/theme';

export default function PublicProfileLayout() {
  const { colors } = useTheme();

  return (
    <GameFavoritesProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          presentation: 'card',
        }}
      >
        <Stack.Screen name="[uid]/index" options={{ title: 'Player Profile', headerShown: false }} />
        <Stack.Screen name="[uid]/followers" options={{ title: 'Followers' }} />
        <Stack.Screen name="[uid]/following" options={{ title: 'Following' }} />
        <Stack.Screen name="[uid]/favourites" options={{ title: 'Favourites' }} />
        <Stack.Screen name="[uid]/reviews" options={{ title: 'Reviews' }} />
        <Stack.Screen name="[uid]/blocked" options={{ title: 'Blocked Users' }} />
      </Stack>
    </GameFavoritesProvider>
  );
}
