import { Link, Stack, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { auth } from '../../lib/firebase';
import {
  GameSearchProvider,
  useGameSearch,
  type SearchScope,
} from '../../lib/hooks/useGameSearch';
import { GameFavoritesProvider } from '../../lib/hooks/useGameFavorites';
import { useFollowRequests } from '../../lib/hooks/useFollowRequests';

const LOGO = require('../../assets/logo.png');

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
    isDark: boolean;
  };
  user: ReturnType<typeof useAuthUser>['user'];
  pendingRequests: number;
};

function WebNavBar({ activeRoute, palette, user, pendingRequests }: WebNavBarProps) {
  const router = useRouter();
  const { term, setTerm, submit, resetSearch, setScope } = useGameSearch();

  const scopeByRoute: Record<string, SearchScope> = {
    home: 'games',
    fav: 'favourites',
    friends: 'friends',
    profile: 'games',
  };
  const placeholderByScope: Record<SearchScope, string> = {
    games: 'Search games',
    favourites: 'Search favourites',
    friends: 'Search friends',
  };
  const nextScope = scopeByRoute[activeRoute] ?? 'games';

  useEffect(() => {
    setScope(nextScope);
  }, [setScope, nextScope]);

  const placeholder = placeholderByScope[nextScope] ?? 'Search';
  const showSearch = activeRoute !== 'profile';
  const isDarkSurface = palette.isDark;
  const inputBackground = isDarkSurface ? '#1f2937' : '#ffffff';
  const signOutTextColor = isDarkSurface ? '#f1f5f9' : '#1f2937';

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Failed to sign out', error);
    }
  };

  const handleHomePress = () => {
    setScope('games');
    resetSearch();
    if (activeRoute !== 'home') {
      router.push('/(tabs)/home');
    }
  };
  return (
    <View
      style={[
        styles.navContainer,
        { backgroundColor: palette.background, borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.leftSection}>
        <Pressable onPress={handleHomePress} style={styles.logoButton} hitSlop={8}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Pressable>
        <View style={styles.links}>
          {NAV_ITEMS.map(({ name, label }, index) => {
            const isActive = name === activeRoute;
            const showRequestBadge = name === 'profile' && pendingRequests > 0;
            return (
              <View key={name} style={styles.linkWrapper}>
                <Link
                  href={`/(tabs)/${name}`}
                  style={[
                    styles.link,
                    index > 0 && styles.linkSpacing,
                    { color: isActive ? palette.text : palette.muted },
                    isActive && { borderBottomColor: palette.accent, borderBottomWidth: 2 },
                  ]}
                  onPress={(event) => {
                    if (name === 'home') {
                      event?.preventDefault();
                      handleHomePress();
                    }
                  }}
                >
                  {label}
                </Link>
                {showRequestBadge ? <View style={styles.navBadge} /> : null}
              </View>
            );
          })}
        </View>
      </View>
      {showSearch ? (
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={term}
          onChangeText={setTerm}
          returnKeyType="search"
          onSubmitEditing={() => submit()}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.searchInput,
            {
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: inputBackground,
            },
          ]}
        />
      ) : (
        <View style={styles.searchPlaceholder} />
      )}
      <View style={styles.authLinks}>
        {user ? (
          <Pressable
            onPress={handleSignOut}
            style={[styles.signOutButton, { borderColor: palette.border }]}
          >
            <Text
            style={[
              styles.signOutLabel,
              {
                color: signOutTextColor,
              },
            ]}
          >
              Sign out
            </Text>
          </Pressable>
        ) : (
          <>
            <Link href="/signup" style={[styles.loginLink, { color: palette.text }]}>Sign Up</Link>
            <Link
              href="/login"
              style={[styles.loginLink, styles.authSpacing, { color: palette.text }]}
            >
              Login
            </Link>
          </>
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const accent = scheme === 'dark' ? '#7dcfff' : '#2b6cb0';
  const { user } = useAuthUser();
  const followRequests = useFollowRequests(user?.uid ?? null);
  const pendingRequests = followRequests.requests.length;
  const profileBadge =
    pendingRequests > 0 ? (pendingRequests > 99 ? '99+' : pendingRequests) : undefined;
  const pageBackground = '#0f172a';
  const navBackground = pageBackground;
  const navBorder = '#1e293b';
  const navMuted = '#94a3b8';
  const palette = {
    background: navBackground,
    border: navBorder,
    text: '#f8fafc',
    muted: navMuted,
    accent,
    isDark: true,
  };

  if (Platform.OS === 'web') {
    return (
      <GameFavoritesProvider>
        <GameSearchProvider>
          <Stack
            screenOptions={({ route }) => ({
              header: () => (
                <WebNavBar
                  activeRoute={route.name}
                  palette={palette}
                  user={user}
                  pendingRequests={pendingRequests}
                />
              ),
              contentStyle: { backgroundColor: pageBackground },
            })}
          >
            <Stack.Screen name="home" />
            <Stack.Screen name="fav" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="profile" />
          </Stack>
        </GameSearchProvider>
      </GameFavoritesProvider>
    );
  }

  return (
    <GameFavoritesProvider>
      <GameSearchProvider>
        <Tabs
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: accent,
            tabBarInactiveTintColor: navMuted,
            tabBarStyle: {
              backgroundColor: navBackground,
              borderTopColor: navBorder,
            },
            sceneContainerStyle: { backgroundColor: pageBackground },
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
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarBadge: profileBadge,
            }}
          />
        </Tabs>
      </GameSearchProvider>
    </GameFavoritesProvider>
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
  logo: {
    width: 40,
    height: 40,
  },
  logoButton: {
    borderRadius: 20,
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
  linkWrapper: {
    position: 'relative',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  searchInput: {
    flex: 1,
    height: 36,
    marginHorizontal: 32,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  searchPlaceholder: {
    flex: 1,
    marginHorizontal: 32,
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
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  signOutLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
