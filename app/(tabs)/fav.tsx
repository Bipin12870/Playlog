import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SearchResults } from '../../components/home';
import { useGameFavorites } from '../../lib/hooks/useGameFavorites';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import { useTheme, type ThemeColors } from '../../lib/theme';
import type { GameSummary } from '../../types/game';

const MOBILE_PAGE_SIZE = 10;

export default function FavScreen() {
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;
  const router = useRouter();
  const { colors, statusBarStyle, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const {
    favourites,
    maxFavourites,
    remainingSlots,
    hasUnlimitedFavorites,
    isAuthenticated,
  } = useGameFavorites();
  const { width } = useWindowDimensions();
  const baseColumnCount = getColumnCount(width);
  const mobileColumnCount = width >= 640 ? 2 : 1;
  const rawColumnCount = isMobile ? mobileColumnCount : baseColumnCount;
  const columnCount = isWeb ? 6 : Math.max(rawColumnCount, 3);
  const { submittedTerm, submissionId, setScope } = useGameSearch();
  const [activeQuery, setActiveQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);

  useEffect(() => {
    setScope('favourites');
  }, [setScope]);

  useEffect(() => {
    setActiveQuery(submittedTerm.trim());
  }, [submittedTerm, submissionId]);

  useEffect(() => {
    if (!activeQuery) {
      setVisibleCount(MOBILE_PAGE_SIZE);
    }
  }, [isAuthenticated, activeQuery]);

  const handleSelect = useCallback(
    (game: GameSummary) => {
      router.push({
        pathname: '/game/[id]',
        params: { id: game.id.toString(), name: game.name },
      });
    },
    [router]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + MOBILE_PAGE_SIZE);
  }, []);

  const subtitle = useMemo(() => {
    if (!isAuthenticated) {
      return 'Sign in to keep your favourite games synced across devices.';
    }
    if (hasUnlimitedFavorites) {
      return `Saved ${favourites.length} favourite${favourites.length === 1 ? '' : 's'}`;
    }
    return `Saved ${favourites.length} / ${maxFavourites} games`;
  }, [isAuthenticated, hasUnlimitedFavorites, favourites.length, maxFavourites]);

  const baseEmptyState = useMemo(
    () =>
      isAuthenticated
        ? {
            title: 'No favourites yet',
            copy: 'Tap the heart on any game card to save it here.',
          }
        : {
            title: 'Sign in to save favourites',
            copy: 'Log in to start collecting games you love.',
          },
    [isAuthenticated]
  );

  const filteredFavourites = useMemo(() => {
    const query = activeQuery.toLowerCase();
    if (!query) {
      return favourites;
    }
    return favourites.filter((game) => game.name.toLowerCase().includes(query));
  }, [activeQuery, favourites]);

  const emptyState = useMemo(() => {
    if (activeQuery) {
      return {
        title: 'No favourites match your search',
        copy: 'Try another title or clear the search to see all saved games.',
      };
    }
    return baseEmptyState;
  }, [activeQuery, baseEmptyState]);

  const visibleFavourites = useMemo(() => {
    if (activeQuery) {
      return filteredFavourites;
    }
    const limit = Math.min(visibleCount, filteredFavourites.length);
    return filteredFavourites.slice(0, limit);
  }, [activeQuery, filteredFavourites, visibleCount]);

  const hasMoreFavourites = !activeQuery && filteredFavourites.length > visibleFavourites.length;

  if (!isMobile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favourites</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {isAuthenticated && !hasUnlimitedFavorites && remainingSlots === 0 ? (
            <Text style={styles.limitNotice}>You have reached your current limit.</Text>
          ) : null}
        </View>
        <SearchResults
          games={filteredFavourites}
          loading={false}
          error={null}
          columnCount={columnCount}
          onSelect={handleSelect}
          contentContainerStyle={styles.resultsContent}
          cardStyle={styles.webCard}
          emptyState={emptyState}
        />
      </View>
    );
  }

  const mobileHeaderComponent = (
    <View style={styles.mobileListHeader}>
      <View style={styles.mobileIntro}>
        <Text style={styles.mobileTitle}>Favourites</Text>
        <Text style={styles.mobileSubtitle}>{subtitle}</Text>
        {isAuthenticated && !hasUnlimitedFavorites && remainingSlots === 0 ? (
          <Text style={styles.limitNotice}>You have reached your current limit.</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.mobileSafe}>
      <StatusBar barStyle={statusBarStyle} />
      <View style={styles.mobileContent}>
        <SearchResults
          games={visibleFavourites}
          loading={false}
          error={null}
          columnCount={columnCount}
          onSelect={handleSelect}
          contentContainerStyle={styles.mobileResultsContent}
          gridRowStyle={styles.mobileGridRow}
          cardStyle={styles.mobileCard}
          emptyState={emptyState}
          headerComponent={mobileHeaderComponent}
          onLoadMore={handleLoadMore}
          hasMore={hasMoreFavourites}
        />
      </View>
    </SafeAreaView>
  );
}

function getColumnCount(width: number) {
  if (width >= 1400) return 5;
  if (width >= 1100) return 4;
  if (width >= 900) return 3;
  if (width >= 640) return 2;
  return 1;
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const borderColor = colors.border;
  const surface = colors.surface;
  const surfaceSecondary = colors.surfaceSecondary;
  const subtleText = isDark ? colors.subtle : colors.muted;

  return StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: colors.background },
    header: { gap: 8, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.muted },
    limitNotice: { fontSize: 13, color: colors.danger, fontWeight: '600' },
    searchBar: {
      marginBottom: 16,
      borderRadius: 18,
      backgroundColor: surfaceSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor,
    },
    searchInput: {
      fontSize: 16,
      color: colors.text,
    },
    resultsContent: { paddingBottom: 48 },
    webCard: { backgroundColor: surface },
    mobileSafe: { flex: 1, backgroundColor: colors.background },
    mobileContent: { flex: 1, backgroundColor: colors.background },
    mobileListHeader: { gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    mobileIntro: { marginTop: 24, gap: 4 },
    mobileTitle: { color: colors.text, fontSize: 30, fontWeight: '800' },
    mobileSubtitle: { color: subtleText, fontSize: 14 },
    mobileResultsContent: { paddingHorizontal: 20, paddingBottom: 120 },
    mobileGridRow: { gap: 16, paddingBottom: 18 },
    mobileCard: {
      backgroundColor: surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor,
      marginBottom: 0,
    },
  });
}
