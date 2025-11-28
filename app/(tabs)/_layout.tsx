import { Link, Stack, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { auth } from '../../lib/firebase';
import {
  GameSearchProvider,
  useGameSearch,
  type SearchScope,
} from '../../lib/hooks/useGameSearch';
import { GameFavoritesProvider } from '../../lib/hooks/useGameFavorites';
import { useFollowRequests } from '../../lib/hooks/useFollowRequests';
import {
  requestCategoryDrawerOpen,
  subscribeToCategoryDrawerEvents,
} from '../../lib/events/categoryDrawer';
import { useSearchHistory, type SearchHistoryItem } from '../../lib/hooks/useSearchHistory';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { SearchHistoryDropdown } from '../../components/search/SearchHistoryDropdown';
import { useTheme } from '../../lib/theme';

const LOGO = require('../../assets/logo.png');
let pendingLogoGlow = false;

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
    input: string;
  };
  user: ReturnType<typeof useAuthUser>['user'];
  pendingRequests: number;
  unreadNotifications: number;
};

function WebNavBar({
  activeRoute,
  palette,
  user,
  pendingRequests,
  unreadNotifications,
}: WebNavBarProps) {
  const router = useRouter();
  const { term, setTerm, submit, resetSearch, setScope } = useGameSearch();
  const { addEntry, filterByPrefix } = useSearchHistory();
  const [categoryActive, setCategoryActive] = useState(false);
  const [logoHighlight, setLogoHighlight] = useState(false);
  const [historySuggestions, setHistorySuggestions] = useState<SearchHistoryItem[]>([]);
  const [historyDropdownVisible, setHistoryDropdownVisible] = useState(false);
  const historyBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoGlowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  useEffect(() => {
    const unsubscribe = subscribeToCategoryDrawerEvents((event) => {
      if (event.type === 'summary') {
        setCategoryActive(event.filtersActive);
      }
    });
    return unsubscribe;
  }, []);

  const placeholder = placeholderByScope[nextScope] ?? 'Search';
  const showSearch = activeRoute !== 'profile';
  const showNavSignOut = Boolean(user && activeRoute === 'profile');
  const isDarkSurface = palette.isDark;
  const inputBackground = palette.input;
  const signOutTextColor = palette.text;

  useEffect(() => {
    return () => {
      if (historyBlurTimeoutRef.current) {
        clearTimeout(historyBlurTimeoutRef.current);
      }
      if (logoGlowTimeoutRef.current) {
        clearTimeout(logoGlowTimeoutRef.current);
      }
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Failed to sign out', error);
    }
  };

  const confirmSignOut = () => {
    const execute = () => {
      void handleSignOut();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Are you sure you want to sign out?');
        if (confirmed) execute();
      } else {
        execute();
      }
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: execute },
    ]);
  };

  const handleHomePress = () => {
    const shouldGlow = activeRoute !== 'home';
    if (shouldGlow) {
      pendingLogoGlow = true;
    }
    setScope('games');
    resetSearch();
    if (activeRoute !== 'home') {
      router.push('/(tabs)/home');
    }
  };
  useEffect(() => {
    if (activeRoute === 'home' && pendingLogoGlow) {
      pendingLogoGlow = false;
      setLogoHighlight(true);
      if (logoGlowTimeoutRef.current) {
        clearTimeout(logoGlowTimeoutRef.current);
      }
      logoGlowTimeoutRef.current = setTimeout(() => {
        setLogoHighlight(false);
      }, 900);
    }
  }, [activeRoute]);
  const handleCategoryOpen = () => {
    const open = () => requestCategoryDrawerOpen();
    if (activeRoute !== 'home') {
      handleHomePress();
      setTimeout(open, 0);
    } else {
      open();
    }
  };

  const updateHistorySuggestions = useCallback(
    (value: string) => {
      const matches = filterByPrefix(value);
      setHistorySuggestions(matches);
      setHistoryDropdownVisible(matches.length > 0);
    },
    [filterByPrefix],
  );

  const handleChangeSearchTerm = useCallback(
    (value: string) => {
      setTerm(value);
      updateHistorySuggestions(value);
    },
    [setTerm, updateHistorySuggestions],
  );

  const handleSearchFocus = useCallback(() => {
    if (historyBlurTimeoutRef.current) {
      clearTimeout(historyBlurTimeoutRef.current);
      historyBlurTimeoutRef.current = null;
    }
    const matches = filterByPrefix(term);
    setHistorySuggestions(matches);
    setHistoryDropdownVisible(matches.length > 0);
  }, [filterByPrefix, term]);

  const handleSearchBlur = useCallback(() => {
    if (historyBlurTimeoutRef.current) {
      clearTimeout(historyBlurTimeoutRef.current);
    }
    historyBlurTimeoutRef.current = setTimeout(() => {
      setHistoryDropdownVisible(false);
    }, 120);
  }, []);

  const handleSubmitSearch = useCallback(
    (value?: string) => {
      const rawValue = typeof value === 'string' ? value : term;
      const trimmed = rawValue.trim();
      if (!trimmed) {
        setHistoryDropdownVisible(false);
        setHistorySuggestions([]);
        return;
      }
      setTerm(trimmed);
      submit(trimmed);
      addEntry(trimmed);
      setHistoryDropdownVisible(false);
      setHistorySuggestions([]);
    },
    [addEntry, setTerm, submit, term],
  );

  const handleSelectHistoryTerm = useCallback(
    (value: string) => {
      handleSubmitSearch(value);
    },
    [handleSubmitSearch],
  );

  const handleOpenHistoryScreen = useCallback(() => {
    setHistoryDropdownVisible(false);
    setHistorySuggestions([]);
    router.push('/search-history');
  }, [router]);

  return (
    <View
      style={[
        styles.navContainer,
        { backgroundColor: palette.background, borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.leftSection}>
        <Pressable
          onPress={handleHomePress}
          style={({ pressed }) => [
            styles.logoButton,
            logoHighlight && {
              borderWidth: 2,
              borderColor: palette.accent,
              backgroundColor: `${palette.accent}22`,
              shadowColor: palette.accent,
              shadowOpacity: 0.4,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            },
            pressed && { opacity: 0.9 },
          ]}
          hitSlop={8}
        >
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Pressable>
        <View style={styles.links}>
          {NAV_ITEMS.map(({ name, label }, index) => {
            const isActive = name === activeRoute;
            const profileBadgeCount =
              name === 'profile' ? pendingRequests + unreadNotifications : 0;
            const showProfileBadge = profileBadgeCount > 0;
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
                {showProfileBadge ? (
                  <View style={styles.navBadge}>
                    <Text style={[styles.navBadgeText, { color: '#fff' }]}>
                      {profileBadgeCount > 99 ? '99+' : profileBadgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.rightSection}>
        {showSearch ? (
          <View style={styles.searchArea}>
            <View
              style={[
                styles.searchInputWrapper,
                { borderColor: palette.border, backgroundColor: inputBackground },
              ]}
            >
              <TextInput
                placeholder={placeholder}
                placeholderTextColor={palette.muted}
                value={term}
                onChangeText={handleChangeSearchTerm}
                returnKeyType="search"
                onSubmitEditing={() => handleSubmitSearch()}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                style={[styles.searchInput, { color: palette.text }]}
              />
              <Pressable
                onPress={handleCategoryOpen}
                style={({ pressed }) => [
                  styles.searchFilter,
                  categoryActive && {
                    borderColor: palette.accent,
                    backgroundColor: `${palette.accent}26`,
                  },
                  pressed && styles.searchFilterPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open category filters"
              >
                <Ionicons name="options-outline" size={18} color={palette.text} />
                {categoryActive ? (
                  <View style={[styles.searchFilterDot, { backgroundColor: palette.accent }]} />
                ) : null}
              </Pressable>
            </View>
            {historyDropdownVisible ? (
              <SearchHistoryDropdown
                style={styles.historyDropdown}
                items={historySuggestions}
                onSelect={handleSelectHistoryTerm}
                onSeeAll={handleOpenHistoryScreen}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.searchPlaceholder} />
        )}
        <View style={styles.authLinks}>
          {user ? (
            showNavSignOut ? (
              <Pressable
                onPress={confirmSignOut}
                style={[styles.signOutButton, { borderColor: palette.border }]}
              >
                <Text style={[styles.signOutLabel, { color: signOutTextColor }]}>Sign out</Text>
              </Pressable>
            ) : null
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
    </View>
  );
}

type NativeTabsProps = {
  accent: string;
  navMuted: string;
  navBackground: string;
  navBorder: string;
  pageBackground: string;
  profileBadge?: string;
};

function NativeTabs({
  accent,
  navMuted,
  navBackground,
  navBorder,
  pageBackground,
  profileBadge,
}: NativeTabsProps) {
  const { resetSearch, setScope } = useGameSearch();

  const handleHomeTabPress = useCallback(() => {
    setScope('games');
    resetSearch();
  }, [resetSearch, setScope]);

  return (
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
        tabBarLabelPosition: 'below-icon',
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
      <Tabs.Screen
        name="home"
        options={{ title: 'Home' }}
        listeners={() => ({
          tabPress: () => {
            handleHomeTabPress();
          },
        })}
      />
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
  );
}
export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const accent = colors.accent;
  const { user } = useAuthUser();
  const followRequests = useFollowRequests(user?.uid ?? null);
  const pendingRequests = followRequests.requests.length;
  const { notifications } = useNotifications(user?.uid ?? null);
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const profileBadgeCount = pendingRequests + unreadNotifications;
  const profileBadge =
    profileBadgeCount > 0 ? (profileBadgeCount > 99 ? '99+' : String(profileBadgeCount)) : undefined;
  const pageBackground = colors.background;
  const navBackground = colors.surface;
  const navBorder = colors.border;
  const navMuted = colors.muted;
  const palette = {
    background: navBackground,
    border: navBorder,
    text: colors.text,
    muted: navMuted,
    accent,
    isDark,
    input: colors.inputBackground,
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
                  unreadNotifications={unreadNotifications}
                />
              ),
              contentStyle: { backgroundColor: pageBackground },
            })}
          >
            <Stack.Screen name="home" />
            <Stack.Screen name="fav" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="notifications" />
          </Stack>
        </GameSearchProvider>
      </GameFavoritesProvider>
    );
  }

  return (
    <GameFavoritesProvider>
      <GameSearchProvider>
        <NativeTabs
          accent={accent}
          navMuted={navMuted}
          navBackground={navBackground}
          navBorder={navBorder}
          pageBackground={pageBackground}
          profileBadge={profileBadge}
        />
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
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    gap: 16,
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
    top: -10,
    right: -14,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: { fontSize: 11, fontWeight: '700' },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 6,
    fontSize: 16,
  },
  searchArea: {
    flex: 1,
    position: 'relative',
  },
  historyDropdown: {
    zIndex: 30,
  },
  searchPlaceholder: {
    flex: 1,
  },
  searchFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchFilterPressed: {
    opacity: 0.85,
  },
  searchFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
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
