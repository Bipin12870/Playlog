import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

import { SearchResults } from '../../components/home';
import { useGameFavorites } from '../../lib/hooks/useGameFavorites';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import type { GameSummary } from '../../types/game';

const PAGE_BG = '#0f172a';
const SURFACE_BG = '#0b1120';
const TEXT = '#f8fafc';
const MUTED = '#cbd5f5';

export default function FavScreen() {
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;
  const router = useRouter();
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
  const { term, setTerm, submit, submittedTerm, submissionId, setScope } = useGameSearch();
  const [activeQuery, setActiveQuery] = useState('');

  useEffect(() => {
    setScope('favourites');
  }, [setScope]);

  useEffect(() => {
    setActiveQuery(submittedTerm.trim());
  }, [submittedTerm, submissionId]);

  const handleSelect = useCallback(
    (game: GameSummary) => {
      router.push({
        pathname: '/game/[id]',
        params: { id: game.id.toString(), name: game.name },
      });
    },
    [router]
  );

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

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

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
        <Text style={styles.mobileTitle}>My Favourite Games</Text>
        <Text style={styles.mobileSubtitle}>Your collection of amazing games</Text>
      </View>
    </View>
  );

  const mobileFooterComponent = (
    <View style={styles.mobileFooter}>
      <Pressable style={styles.loadMoreBtn} onPress={handleSubmit}>
        <Text style={styles.loadMoreText}>Load More…</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.mobileSafe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileContent}>
        <SearchResults
          games={filteredFavourites}
          loading={false}
          error={null}
          columnCount={columnCount}
          onSelect={handleSelect}
          contentContainerStyle={styles.mobileResultsContent}
          gridRowStyle={styles.mobileGridRow}
          cardStyle={styles.mobileCard}
          emptyState={emptyState}
          headerComponent={mobileHeaderComponent}
          footerComponent={mobileFooterComponent}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: PAGE_BG },
  header: { gap: 8, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: TEXT },
  subtitle: { fontSize: 14, color: MUTED },
  limitNotice: { fontSize: 13, color: '#f87171', fontWeight: '600' },
  searchBar: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  searchInput: {
    fontSize: 16,
    color: TEXT,
  },
  resultsContent: { paddingBottom: 48 },
  webCard: { backgroundColor: '#111827' },
  mobileSafe: { flex: 1, backgroundColor: PAGE_BG },
  mobileContent: { flex: 1, backgroundColor: PAGE_BG },
  mobileListHeader: { gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  mobileIntro: { marginTop: 24, gap: 4 },
  mobileTitle: { color: '#f8fafc', fontSize: 30, fontWeight: '800' },
  mobileSubtitle: { color: '#cbd5f5', fontSize: 14 },
  mobileResultsContent: { paddingHorizontal: 20, paddingBottom: 120 },
  mobileGridRow: { gap: 16, paddingBottom: 18 },
  mobileCard: {
    backgroundColor: '#1e1e22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 0,
  },
  mobileFooter: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  loadMoreBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 32,
  },
  loadMoreText: { color: '#f8fafc', fontWeight: '700' },
});
