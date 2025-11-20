import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f9fafb',
        headerTitleAlign: 'center',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="followers"
        options={{ title: 'Followers' }}
      />
      <Stack.Screen
        name="following"
        options={{ title: 'Following' }}
      />
      <Stack.Screen
        name="blocked"
        options={{ title: 'Blocked Users' }}
      />
      <Stack.Screen
        name="requests"
        options={{ title: 'Follow Requests' }}
      />
      <Stack.Screen
        name="edit"
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="reviews"
        options={{ title: 'Your Reviews' }}
      />
      <Stack.Screen
        name="mute"
        options={{ title: 'Mute Lists' }}
      />
      <Stack.Screen
        name="visibility"
        options={{ title: 'Visibility Settings' }}
      />
      <Stack.Screen
        name="data-export"
        options={{ title: 'Data Export' }}
      />
      <Stack.Screen
        name="delete"
        options={{ title: 'Delete Account' }}
      />
    </Stack>
  );
}
