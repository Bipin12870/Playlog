import { Stack } from 'expo-router';

export default function PublicProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f9fafb',
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
    </Stack>
  );
}
