import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { SearchResults } from '../../components/home';
import { useGameFavorites } from '../../lib/hooks/useGameFavorites';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import type { GameSummary } from '../../types/game';

export default function FavScreen() {
  const isWeb = Platform.OS === 'web';
  const {
    favourites,
    maxFavourites,
    remainingSlots,
    hasUnlimitedFavorites,
    isAuthenticated,
  } = useGameFavorites();
  const { width } = useWindowDimensions();
  const columnCount = getColumnCount(width);
  const { term, setTerm, submit, submittedTerm, submissionId, setScope } = useGameSearch();
  const [activeQuery, setActiveQuery] = useState('');

  useEffect(() => {
    setScope('favourites');
  }, [setScope]);

  useEffect(() => {
    setActiveQuery(submittedTerm.trim());
  }, [submittedTerm, submissionId]);

  const handleSelect = useCallback((game: GameSummary) => {
    // TODO: Route to a dedicated game details view when available.
    console.log('View details for', game.name);
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

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {isAuthenticated && !hasUnlimitedFavorites && remainingSlots === 0 ? (
          <Text style={styles.limitNotice}>You have reached your current limit.</Text>
        ) : null}
      </View>
      {!isWeb ? (
        <View style={styles.searchBar}>
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Search favourites"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.searchInput}
          />
        </View>
      ) : null}
      <SearchResults
        games={filteredFavourites}
        loading={false}
        error={null}
        columnCount={columnCount}
        onSelect={handleSelect}
        contentContainerStyle={[
          styles.resultsContent,
          columnCount === 1 && styles.singleColumnContent,
        ]}
        gridRowStyle={columnCount === 1 ? styles.singleColumnRow : undefined}
        cardStyle={columnCount === 1 ? styles.singleColumnCard : undefined}
        emptyState={emptyState}
      />
    </View>
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
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { gap: 8, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#4b5563' },
  limitNotice: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  searchBar: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    fontSize: 16,
    color: '#111827',
  },
  resultsContent: { paddingBottom: 48 },
  singleColumnContent: { alignItems: 'center' },
  singleColumnRow: { gap: 0, paddingBottom: 20 },
  singleColumnCard: { flex: 0, maxWidth: 420, width: '100%' },
});
 
