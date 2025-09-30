import { Link, Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';

const NAV_ITEMS = [
  { name: 'home', label: 'Home' },
  { name: 'fav', label: 'Favourites' },
  { name: 'friends', label: 'Friends' },
  { name: 'profile', label: 'Profile' },
];

type WebNavBarProps = {
  activeRoute: string;
  palette: {
    background: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
  };
};

function WebNavBar({ activeRoute, palette }: WebNavBarProps) {
  return (
    <View
      style={[
        styles.navContainer,
        { backgroundColor: palette.background, borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.logoPlaceholder,
            {
              borderColor: palette.border,
              backgroundColor: palette.background === '#ffffff' ? '#f9fafb' : '#111827',
            },
          ]}
        >
          <Text style={[styles.logoText, { color: palette.muted }]}>Logo</Text>
        </View>
        <View style={styles.links}>
          {NAV_ITEMS.map(({ name, label }, index) => {
            const isActive = name === activeRoute;
            return (
              <Link
                key={name}
                href={`/(tabs)/${name}`}
                style={[
                  styles.link,
                  index > 0 && styles.linkSpacing,
                  { color: isActive ? palette.text : palette.muted },
                  isActive && { borderBottomColor: palette.accent, borderBottomWidth: 2 },
                ]}
              >
                {label}
              </Link>
            );
          })}
        </View>
      </View>
      <TextInput
        placeholder="Search games"
        placeholderTextColor={palette.muted}
        style={[
          styles.searchInput,
          {
            borderColor: palette.border,
            color: palette.text,
            backgroundColor: palette.background === '#ffffff' ? '#ffffff' : '#1f2937',
          },
        ]}
      />
      <View style={styles.authLinks}>
        <Link href="/signup" style={[styles.loginLink, { color: palette.text }]}>Sign Up</Link>
        <Link
          href="/login"
          style={[styles.loginLink, styles.authSpacing, { color: palette.text }]}
        >
          Login
        </Link>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const accent = scheme === 'dark' ? '#7dcfff' : '#2b6cb0';
  const palette = {
    background: scheme === 'dark' ? '#111827' : '#ffffff',
    border: scheme === 'dark' ? '#1f2937' : '#e5e7eb',
    text: scheme === 'dark' ? '#f9fafb' : '#111827',
    muted: scheme === 'dark' ? '#9ca3af' : '#4b5563',
    accent,
  };

  if (Platform.OS === 'web') {
    return (
      <Stack
        screenOptions={({ route }) => ({
          header: () => <WebNavBar activeRoute={route.name} palette={palette} />,
        })}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="fav" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="profile" />
      </Stack>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'home':
              icon = 'home';
              break;
            case 'fav':
              icon = 'heart';
              break;
            case 'friends':
              icon = 'people';
              break;
            case 'profile':
              icon = 'person';
              break;
          }
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="fav" options={{ title: 'Favourites' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 4,
    textDecorationLine: 'none',
  },
  linkSpacing: {
    marginLeft: 24,
  },
  searchInput: {
    flex: 1,
    height: 36,
    marginHorizontal: 32,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  authLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authSpacing: {
    marginLeft: 24,
  },
});
