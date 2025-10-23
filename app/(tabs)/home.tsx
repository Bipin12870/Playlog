import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInputProps, View, useWindowDimensions } from 'react-native';

import {
  DiscoverySections,
  HeroHeader,
  SearchResults,
  type DiscoverySection,
} from '../../components/home';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import {
  fetchFeaturedGames,
  fetchRandomGames,
  fetchTrendingGames,
  searchGames,
} from '../../lib/igdb';
import type { GameSummary } from '../../types/game';

export default function HomeScreen() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const columnCount = getColumnCount(width);

  const { term, setTerm, submit, submittedTerm, submissionId } = useGameSearch();

  const [activeQuery, setActiveQuery] = useState('');
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredGames, setFeaturedGames] = useState<GameSummary[]>([]);
  const [likedGames, setLikedGames] = useState<GameSummary[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<GameSummary[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);

  const handleViewDetails = useCallback((selected: GameSummary) => {
    // TODO: Navigate to a game details screen when available.
    console.log('View details for', selected.name);
  }, []);

  const fetchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchGames(query);
      setGames(Array.isArray(data) ? data : []);
      setActiveQuery(query);
    } catch (err) {
      console.error(err);
      setError('Unable to load games right now. Try again in a bit.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExplore = useCallback(async () => {
    setExploreLoading(true);
    try {
      const [featured, trending, surprise] = await Promise.allSettled([
        fetchFeaturedGames(),
        fetchTrendingGames(),
        fetchRandomGames(),
      ]);

      const nextFeatured =
        featured.status === 'fulfilled' && Array.isArray(featured.value) ? featured.value : [];
      const nextTrending =
        trending.status === 'fulfilled' && Array.isArray(trending.value) ? trending.value : [];
      const nextSurprise =
        surprise.status === 'fulfilled' && Array.isArray(surprise.value) ? surprise.value : [];

      setFeaturedGames(nextFeatured);
      setLikedGames(nextTrending);
      setRecommendedGames(nextSurprise);

      const hadFailure = [featured, trending, surprise].some(
        (result) => result.status === 'rejected'
      );
      setExploreError(hadFailure ? 'Some discovery rows failed to load. Try refreshing.' : null);
    } catch (err) {
      console.error(err);
      setExploreError('Unable to load discovery sections right now.');
    } finally {
      setExploreLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = submittedTerm.trim();
    if (!trimmed) {
      setLoading(false);
      setActiveQuery('');
      setGames([]);
      setError(null);
      return;
    }
    fetchGames(trimmed);
  }, [submittedTerm, submissionId, fetchGames]);

  useEffect(() => {
    if (!submittedTerm.trim()) {
      loadExplore();
    }
  }, [submittedTerm, loadExplore]);

  const exploreSections = useMemo<DiscoverySection[]>(
    () => [
      {
        key: 'featured',
        title: 'Featured Games',
        subtitle: 'Critically acclaimed hits you shouldn’t miss.',
        games: featuredGames,
      },
      {
        key: 'liked',
        title: 'Games You May Like',
        subtitle: 'Trending with the Playlog community right now.',
        games: likedGames,
      },
      {
        key: 'recommended',
        title: 'AI Recommended Games',
        subtitle: 'Fresh picks from our discovery engine.',
        games: recommendedGames,
      },
    ],
    [featuredGames, likedGames, recommendedGames]
  );

  const hasActiveSearch = Boolean(activeQuery);

  const searchInputProps: TextInputProps = {
    placeholder: 'Search games',
    placeholderTextColor: '#6b7280',
    value: term,
    onChangeText: setTerm,
    returnKeyType: 'search',
    onSubmitEditing: () => submit(),
    autoCorrect: false,
    autoCapitalize: 'none',
  };

  return (
    <View style={styles.container}>
      

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>
          {hasActiveSearch ? `Results for "${activeQuery}"` : ''}
        </Text>

        {hasActiveSearch ? (
          <SearchResults
            games={games}
            loading={loading}
            error={error}
            columnCount={columnCount}
            onSelect={handleViewDetails}
          />
        ) : (
          <DiscoverySections
            sections={exploreSections}
            columnCount={columnCount}
            loading={exploreLoading}
            error={exploreError}
            onSelect={handleViewDetails}
          />
        )}
      </View>
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
  body: { flex: 1, marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#111827' },
});
