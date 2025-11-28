import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function ProfileStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
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
