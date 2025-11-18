import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '../../components/GameCard';
import { SearchResults } from '../../components/home';
import type { DiscoverySection } from '../../components/home/DiscoverySections';
import {
  fetchCategoryGames,
  fetchFeaturedGames,
  fetchRandomGames,
  fetchTrendingGames,
  searchGames,
} from '../../lib/igdb';
import { useHomeScreen } from './useHomeScreen';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import { useDiscoveryCache } from '../../lib/hooks/useDiscoveryCache';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import type { GameSummary } from '../../types/game';
import {
  broadcastCategorySummary,
  subscribeToCategoryDrawerEvents,
} from '../../lib/events/categoryDrawer';

const LOGO = require('../../assets/logo.png');

type HeroGame = GameSummary | null;
type HeroAnimatedStyle = Animated.WithAnimatedValue<ViewStyle>;

const PLATFORM_FILTERS: FilterOption[] = [
  { label: 'All platforms', value: null },
  { label: 'Nintendo Switch', value: 'nintendo_switch' },
  { label: 'PlayStation 5', value: 'playstation5' },
  { label: 'PlayStation 4', value: 'playstation4' },
  { label: 'Xbox Series X|S', value: 'xbox_series_x' },
  { label: 'Xbox One', value: 'xboxone' },
  { label: 'PC (Windows)', value: 'pc_windows' },
];

const GENRE_FILTERS: FilterOption[] = [
  { label: 'All genres', value: null },
  { label: 'Action', value: 31 },
  { label: 'Adventure / RPG', value: 12 },
  { label: 'Shooter', value: 5 },
  { label: 'Platformer', value: 8 },
  { label: 'Strategy', value: 15 },
  { label: 'Indie / Puzzle', value: 9 },
];

const RELEASE_FILTERS: ReleaseFilterOption[] = [
  { label: 'Any year', value: 'any' },
  { label: 'Recent (last 2 yrs)', value: 'recent' },
  { label: '2020s', value: 'decade-2020' },
  { label: '2010s', value: 'decade-2010' },
  { label: '2000s', value: 'decade-2000' },
  { label: '1990s', value: 'decade-1990' },
];

type ReleaseFilterValue = 'any' | 'recent' | `decade-${number}`;

type FilterState = {
  platform: string | null;
  genre: number | null;
  release: ReleaseFilterValue;
};

type FilterSelection =
  | { type: 'platform'; value: string | null; label: string }
  | { type: 'genre'; value: number | null; label: string }
  | { type: 'release'; value: ReleaseFilterValue; label: string };

type SortValue = 'relevance' | 'rating-desc' | 'rating-asc' | 'release-desc' | 'release-asc';
type FilterOption = { label: string; value: string | number | null };
type ReleaseFilterOption = { label: string; value: ReleaseFilterValue };

type CategoryFilterOptions = {
  platforms: FilterOption[];
  genres: FilterOption[];
  releases: ReleaseFilterOption[];
};

type FilterControls = {
  filters: FilterState;
  options: CategoryFilterOptions;
  filtersActive: boolean;
};

type SortControls = {
  sortValue: SortValue;
  onChangeSort: (value: SortValue) => void;
  counts: { showing: number; total: number };
};

const INITIAL_FILTERS: FilterState = {
  platform: null,
  genre: null,
  release: 'any',
};

const SORT_OPTIONS: FilterOption[] = [
  { label: 'Default sorting', value: 'relevance' },
  { label: 'Highest rating', value: 'rating-desc' },
  { label: 'Lowest rating', value: 'rating-asc' },
  { label: 'Newest release', value: 'release-desc' },
  { label: 'Oldest release', value: 'release-asc' },
];

const CATEGORY_DRAWER_WIDTH = 360;
const SECTION_AD_FREQUENCY = 2;

export default function HomeScreen() {
  const router = useRouter();
  const { sizes, placeholders } = useHomeScreen();
  const isWeb = Platform.OS === 'web';

  const {
    term,
    setTerm,
    submit,
    submittedTerm,
    submissionId,
    resetSearch,
    getCachedResults,
    cacheResults,
    cacheReady,
  } = useGameSearch();
  const [activeQuery, setActiveQuery] = useState('');
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredGames, setFeaturedGames] = useState<GameSummary[]>([]);
  const [likedGames, setLikedGames] = useState<GameSummary[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<GameSummary[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<SortValue>('relevance');
  const [categoryActive, setCategoryActive] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const {
    cacheReady: discoveryCacheReady,
    getCachedDiscovery,
    cacheDiscovery,
  } = useDiscoveryCache();

  const baseColumnCount = getColumnCount(sizes.contentW);
  const columnCount = Platform.OS === 'web' ? 6 : Math.max(baseColumnCount, 3);
  const heroItems = useMemo<HeroGame[]>(() => {
    if (recommendedGames.length) return shuffleGames(recommendedGames);
    if (featuredGames.length) return shuffleGames(featuredGames);
    return Array.from({ length: 3 }, () => null);
  }, [recommendedGames, featuredGames]);

  const [heroIndex, setHeroIndex] = useState(0);
  const heroAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setHeroIndex(0);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroItems]);

  useEffect(() => {
    if (!heroItems.length) return;
    heroAnim.setValue(0.6);
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [heroIndex, heroItems, heroAnim]);

  useEffect(() => {
    const trimmedTerm = term.trim();
    const trimmedSubmitted = submittedTerm.trim();
    if (trimmedTerm === trimmedSubmitted) {
      return;
    }
    const handle = setTimeout(() => {
      submit(trimmedTerm);
    }, 350);
    return () => clearTimeout(handle);
  }, [term, submittedTerm, submit]);

  const heroScale = useMemo(
    () =>
      heroAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1],
      }),
    [heroAnim]
  );

  const heroAnimatedStyle = useMemo<HeroAnimatedStyle>(
    () => ({
      opacity: heroAnim,
      transform: [{ scale: heroScale }],
    }),
    [heroAnim, heroScale]
  );

  const handleViewDetails = useCallback(
    (selected: GameSummary) => {
      router.push({
        pathname: '/game/[id]',
        params: { id: selected.id.toString(), name: selected.name },
      });
    },
    [router]
  );

  const fetchGames = useCallback(
    async (query: string) => {
      setError(null);
      const cached = getCachedResults(query);
      if (cached) {
        setGames(cached);
        setActiveQuery(query);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchGames(query);
        const nextGames = Array.isArray(data) ? data : [];
        setGames(nextGames);
        setActiveQuery(query);
        cacheResults(query, nextGames);
      } catch (err) {
        console.error(err);
        setError('Unable to load games right now. Try again in a bit.');
      } finally {
        setLoading(false);
      }
    },
    [cacheResults, getCachedResults],
  );

  const loadExplore = useCallback(async () => {
    if (!discoveryCacheReady) {
      setExploreLoading(true);
      return;
    }

    const cached = getCachedDiscovery();
    if (cached) {
      setFeaturedGames(cached.featured);
      setLikedGames(cached.liked);
      setRecommendedGames(cached.recommended);
      setExploreError(null);
      setExploreLoading(false);
      return;
    }

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
      cacheDiscovery({ featured: nextFeatured, liked: nextTrending, recommended: nextSurprise });

      const hadFailure = [featured, trending, surprise].some(
        (result) => result.status === 'rejected',
      );
      setExploreError(hadFailure ? 'Some discovery rows failed to load. Try refreshing.' : null);
    } catch (err) {
      console.error(err);
      setExploreError('Unable to load discovery sections right now.');
    } finally {
      setExploreLoading(false);
    }
  }, [cacheDiscovery, discoveryCacheReady, getCachedDiscovery]);

  useEffect(() => {
    const trimmed = submittedTerm.trim();
    if (!trimmed) {
      if (!categoryActive) {
        setLoading(false);
        setActiveQuery('');
        setGames([]);
        setError(null);
      }
      return;
    }
    if (!cacheReady) {
      setLoading(true);
      return;
    }
    setCategoryActive(false);
    setFilters(INITIAL_FILTERS);
    fetchGames(trimmed);
  }, [submittedTerm, submissionId, fetchGames, cacheReady, categoryActive]);

  useEffect(() => {
    if (!submittedTerm.trim()) {
      loadExplore();
    }
  }, [submittedTerm, loadExplore, discoveryCacheReady]);

  const sections = useMemo<DiscoverySection[]>(
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
  const discoveryBlocks = useMemo(
    () =>
      sections.reduce<
        Array<{ type: 'section'; section: DiscoverySection } | { type: 'ad'; key: string }>
      >((acc, section, index) => {
        acc.push({ type: 'section', section });
        const shouldInsertAd =
          SECTION_AD_FREQUENCY > 0 &&
          (index + 1) % SECTION_AD_FREQUENCY === 0 &&
          index + 1 < sections.length;
        if (shouldInsertAd) {
          acc.push({ type: 'ad', key: `inline-ad-${index}` });
        }
        return acc;
      }, []),
    [sections]
  );

  const hasActiveSearch = Boolean(activeQuery);
  const filtersActive = useMemo(
    () => Boolean(filters.platform || filters.genre || filters.release !== 'any'),
    [filters]
  );
  const filterOptions = useMemo<CategoryFilterOptions>(
    () => ({
      platforms: PLATFORM_FILTERS,
      genres: GENRE_FILTERS,
      releases: RELEASE_FILTERS,
    }),
    []
  );
  const filteredGames = useMemo(() => filterGames(games, filters), [games, filters]);
  const sortedGames = useMemo(() => sortGames(filteredGames, sort), [filteredGames, sort]);
  const handleResetFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);
  const handleChangeSort = useCallback((value: SortValue) => setSort(value), []);
  const handleCategorySelection = useCallback(
    async (selection: FilterSelection) => {
      const isClearing =
        (selection.type === 'platform' && !selection.value) ||
        (selection.type === 'genre' && selection.value == null) ||
        (selection.type === 'release' && selection.value === 'any');

      if (isClearing) {
        handleResetFilters();
        setActiveQuery('');
        setGames([]);
        setError(null);
        resetSearch();
        setCategoryActive(false);
        return;
      }

      const nextFilters: FilterState = {
        platform: selection.type === 'platform' ? (selection.value as string | null) : null,
        genre: selection.type === 'genre' ? (selection.value as number | null) : null,
        release:
          selection.type === 'release'
            ? (selection.value as ReleaseFilterValue)
            : 'any',
      };

      setLoading(true);
      setError(null);
      try {
        const data = await fetchCategoryGames(
          selection.type === 'platform'
            ? { kind: 'platform', value: String(selection.value ?? '') }
            : selection.type === 'genre'
            ? { kind: 'genre', value: Number(selection.value) }
            : { kind: 'release', value: selection.value }
        );
        const nextGames = Array.isArray(data) ? data : [];
        setGames(nextGames);
        setActiveQuery(selection.label);
        setFilters(nextFilters);
        resetSearch();
        setCategoryActive(true);
      } catch (err) {
        console.error(err);
        setError('Unable to load games for this filter right now.');
      } finally {
        setLoading(false);
      }
    },
    [handleResetFilters, resetSearch]
  );

  const searchInputProps: TextInputProps = {
    placeholder: 'Search games',
    placeholderTextColor: '#9ca3af',
    value: term,
    onChangeText: setTerm,
    returnKeyType: 'search',
    onSubmitEditing: () => submit(),
    autoCorrect: false,
    autoCapitalize: 'none',
  };

  const cardVariant = (isWeb ? 'default' : 'compact') as 'default' | 'compact';

  const searchResultsProps = {
    games: sortedGames,
    loading,
    error,
    columnCount,
    onSelect: handleViewDetails,
    theme: 'dark' as const,
    cardVariant,
    query: activeQuery,
    emptyState: filtersActive
      ? {
          title: 'No games match these filters',
          copy: 'Try selecting a different platform, genre, or release window.',
        }
      : undefined,
  };

  const discoveryState = {
    exploreLoading,
    exploreError,
  };

  const filterControls: FilterControls = {
    filters,
    options: filterOptions,
    filtersActive,
  };
  const resultCounts = {
    showing: sortedGames.length,
    total: games.length,
  };
  const sortControls: SortControls = {
    sortValue: sort,
    onChangeSort: handleChangeSort,
    counts: resultCounts,
  };

  const categorySummary = useMemo(
    () => getCategorySummary(filters, filterOptions),
    [filters, filterOptions]
  );

  useEffect(() => {
    const unsubscribe = subscribeToCategoryDrawerEvents((event) => {
      if (event.type === 'open') {
        setCategoryDrawerOpen(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    broadcastCategorySummary(categorySummary, filtersActive);
  }, [categorySummary, filtersActive]);

  useEffect(
    () => () => {
      broadcastCategorySummary('Browse platforms, genres & years', false);
    },
    []
  );

  const handleOpenCategoryDrawer = useCallback(() => setCategoryDrawerOpen(true), []);
  const handleCloseCategoryDrawer = useCallback(() => setCategoryDrawerOpen(false), []);
  const handleDrawerSelection = useCallback(
    (selection: FilterSelection) => {
      handleCategorySelection(selection);
      setCategoryDrawerOpen(false);
    },
    [handleCategorySelection]
  );

  const categoryDrawer = (
    <CategoryDrawer
      visible={categoryDrawerOpen}
      onClose={handleCloseCategoryDrawer}
      onSelectCategory={handleDrawerSelection}
      filterControls={filterControls}
    />
  );

  if (isWeb) {
    return (
      <>
        <WebHome
          sizes={sizes}
          placeholders={placeholders}
          sections={sections}
          discoveryBlocks={discoveryBlocks}
          hasActiveSearch={hasActiveSearch}
          searchResultsProps={searchResultsProps}
          discoveryState={discoveryState}
          onSelectGame={handleViewDetails}
          heroItems={heroItems}
          heroIndex={heroIndex}
          heroAnimatedStyle={heroAnimatedStyle}
          filterControls={filterControls}
          sortControls={sortControls}
        />
        {categoryDrawer}
      </>
    );
  }

  const handleLogoPress = useCallback(() => {
    resetSearch();
  }, [resetSearch]);

  return (
    <>
      <NativeHome
        sizes={sizes}
        placeholders={placeholders}
        sections={sections}
        discoveryBlocks={discoveryBlocks}
        hasActiveSearch={hasActiveSearch}
        searchResultsProps={searchResultsProps}
        discoveryState={discoveryState}
        searchInputProps={searchInputProps}
        onSelectGame={handleViewDetails}
        router={router}
        heroItems={heroItems}
        heroIndex={heroIndex}
        heroAnimatedStyle={heroAnimatedStyle}
        onLogoPress={handleLogoPress}
        filterControls={filterControls}
        sortControls={sortControls}
        onOpenCategoryDrawer={handleOpenCategoryDrawer}
      />
      {categoryDrawer}
    </>
  );
}

type SearchResultsProps = {
  games: GameSummary[];
  loading: boolean;
  error: string | null;
  columnCount: number;
  onSelect: (game: GameSummary) => void;
  theme?: 'light' | 'dark';
  cardVariant?: 'default' | 'compact';
  query?: string;
  emptyState?: { title: string; copy: string };
};

type DiscoveryState = {
  exploreLoading: boolean;
  exploreError: string | null;
};

type HomeSectionProps = {
  sizes: ReturnType<typeof useHomeScreen>['sizes'];
  placeholders: unknown[];
  sections: DiscoverySection[];
  discoveryBlocks: Array<{ type: 'section'; section: DiscoverySection } | { type: 'ad'; key: string }>;
  hasActiveSearch: boolean;
  searchResultsProps: SearchResultsProps;
  discoveryState: DiscoveryState;
  onSelectGame: (game: GameSummary) => void;
  heroItems: HeroGame[];
  heroIndex: number;
  heroAnimatedStyle: HeroAnimatedStyle;
  filterControls: FilterControls;
  sortControls: SortControls;
};

type NativeHomeProps = HomeSectionProps & {
  searchInputProps: TextInputProps;
  router: ReturnType<typeof useRouter>;
  onLogoPress: () => void;
  onOpenCategoryDrawer: () => void;
};

function NativeHome({
  sizes,
  placeholders,
  sections,
  discoveryBlocks,
  hasActiveSearch,
  searchResultsProps,
  discoveryState,
  searchInputProps,
  onSelectGame,
  router,
  heroItems,
  heroIndex,
  heroAnimatedStyle,
  onLogoPress,
  filterControls,
  sortControls,
  onOpenCategoryDrawer,
}: NativeHomeProps) {
  const { user, initializing } = useAuthUser();
  const [hideGate, setHideGate] = useState(false);
  const showGate = !initializing && !user && !hideGate;
  const heroGame = heroItems[heroIndex] ?? null;
  const heroCover = resolveHeroUri(heroGame);
  const heroIsPoster = shouldUsePosterLayout(heroGame);
  const heroPosterWidth = Math.max(140, Math.min(sizes.heroH * 0.68, 220));

  return (
    <SafeAreaView style={nativeStyles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={nativeStyles.scrollContent}
      >
        <View style={nativeStyles.header}>
          <Pressable
            onPress={onLogoPress}
            hitSlop={8}
            style={({ pressed }) => [
              nativeStyles.logoBox,
              pressed && nativeStyles.logoBoxPressed,
            ]}
          >
            <Image source={LOGO} style={nativeStyles.logoMark} resizeMode="contain" />
          </Pressable>
          <View style={nativeStyles.searchBox}>
            <Ionicons name="search" size={16} color="#9ca3af" style={nativeStyles.searchIcon} />
            <TextInput
              {...searchInputProps}
              style={nativeStyles.searchInput}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Pressable
            onPress={onOpenCategoryDrawer}
            style={[
              nativeStyles.categoryButton,
              filterControls.filtersActive && nativeStyles.categoryButtonActive,
            ]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open category filters"
          >
            <Ionicons name="options-outline" size={18} color="#f8fafc" />
          </Pressable>
          <View style={nativeStyles.profileBox}>
            <Text style={nativeStyles.profileText}>{user ? 'Profile' : 'Guest'}</Text>
          </View>
        </View>

        {!hasActiveSearch && (
          <View style={nativeStyles.hero}>
            <Animated.View style={[nativeStyles.heroAnimatedWrap, heroAnimatedStyle]}>
              <Pressable
                style={[
                  nativeStyles.heroBanner,
                  heroIsPoster ? { minHeight: sizes.heroH } : { height: sizes.heroH },
                  heroIsPoster && nativeStyles.heroBannerPoster,
                ]}
                onPress={heroGame ? () => onSelectGame(heroGame) : undefined}
                disabled={!heroGame}
              >
                {heroGame && heroIsPoster ? (
                  <View style={nativeStyles.heroPosterLayer}>
                    <GameCard
                      game={heroGame}
                      containerStyle={[nativeStyles.heroPosterCard, { width: heroPosterWidth }]}
                    />
                  </View>
                ) : heroCover ? (
                  <Image source={{ uri: heroCover }} style={nativeStyles.heroImage} />
                ) : (
                  <View style={nativeStyles.heroPlaceholder}>
                    <Ionicons name="arrow-forward-circle-outline" size={28} color="#d1d5db" />
                  </View>
                )}
                <View
                  style={[nativeStyles.heroOverlay, heroIsPoster && nativeStyles.heroOverlayPoster]}
                >
                  <Text style={[nativeStyles.heroTag, heroIsPoster && nativeStyles.heroTagPoster]}>
                    Spotlight
                  </Text>
                  <Text
                    style={[nativeStyles.heroTitle, heroIsPoster && nativeStyles.heroTitlePoster]}
                  >{
                    heroGame?.name ?? 'Discover new games'
                  }</Text>
                  <Text
                    style={[
                      nativeStyles.heroSubtitle,
                      heroIsPoster && nativeStyles.heroSubtitlePoster,
                    ]}
                  >
                    {heroGame ? 'Tap to jump into details' : 'Fresh picks are on the way'}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
            <View style={nativeStyles.heroDots}>
              {heroItems.map((_, idx) => (
                <View
                  key={`hero-dot-${idx}`}
                  style={[nativeStyles.heroDot, idx === heroIndex && nativeStyles.heroDotActive]}
                />
              ))}
            </View>
          </View>
        )}

        {hasActiveSearch ? (
          <View style={nativeStyles.searchResults}>
            {searchResultsProps.query ? (
              <Text style={nativeStyles.resultsHeading}>
                Results for “{searchResultsProps.query}”
              </Text>
            ) : null}
            <SearchMetaBar tone="dark" sortControls={sortControls} />
            <SearchResults {...searchResultsProps} />
          </View>
        ) : (
          <View style={nativeStyles.sectionsContainer}>
            {discoveryBlocks.map((block) =>
              block.type === 'section' ? (
                <NativeSection
                  key={block.section.key}
                  section={block.section}
                  placeholders={placeholders}
                  itemWidth={sizes.ITEM_WIDTH}
                  itemGap={sizes.ITEM_GAP}
                  onSelectGame={onSelectGame}
                />
              ) : (
                <NativeInlineAd key={block.key} />
              )
            )}
            <DiscoveryStatus state={discoveryState} />
          </View>
        )}
      </ScrollView>

      {showGate ? (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
          <View style={nativeStyles.modalBackdrop}>
            <View style={nativeStyles.modalCard}>
              <Text style={nativeStyles.modalTitle}>You’re not signed in</Text>
              <Text style={nativeStyles.modalSubtitle}>Log in or create an account to continue.</Text>
              <View style={nativeStyles.modalRow}>
                <Pressable
                  style={[nativeStyles.modalBtn, nativeStyles.modalPrimary]}
                  onPress={() => {
                    setHideGate(true);
                    router.push('/login');
                  }}
                >
                  <Text style={nativeStyles.modalPrimaryText}>Log in</Text>
                </Pressable>
                <Pressable
                  style={[nativeStyles.modalBtn, nativeStyles.modalSecondary]}
                  onPress={() => {
                    setHideGate(true);
                    router.push('/signup');
                  }}
                >
                  <Text style={nativeStyles.modalSecondaryText}>Sign up</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setHideGate(true)} style={nativeStyles.modalDismiss}>
                <Text style={nativeStyles.modalDismissText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

type WebHomeProps = HomeSectionProps;

function WebHome({
  sizes,
  placeholders,
  sections,
  discoveryBlocks,
  hasActiveSearch,
  searchResultsProps,
  discoveryState,
  onSelectGame,
  heroItems,
  heroIndex,
  heroAnimatedStyle,
  sortControls,
}: WebHomeProps) {
  const heroGame = heroItems[heroIndex] ?? null;
  const heroCover = resolveHeroUri(heroGame);
  const secondaryGame = heroItems.length > 1 ? heroItems[(heroIndex + 1) % heroItems.length] : null;
  const secondaryCover = resolveHeroUri(secondaryGame);
  const heroIsPoster = shouldUsePosterLayout(heroGame);
  const heroPosterWidth = Math.max(200, Math.min(sizes.heroH * 0.6, 340));

  return (
    <View style={webStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={webStyles.scroll}>
        <View style={[webStyles.shell, { maxWidth: sizes.MAX_WIDTH, paddingHorizontal: sizes.SHELL_PADDING }]}>
          {!hasActiveSearch && (
            <View style={[webStyles.heroRow, { gap: 20, paddingHorizontal: sizes.isSM ? 12 : 16 }]}>
              <Animated.View style={[webStyles.heroAnimatedWrap, heroAnimatedStyle]}>
                <Pressable
                  style={[
                    webStyles.heroCard,
                    heroIsPoster ? { minHeight: sizes.heroH } : { height: sizes.heroH },
                    heroIsPoster && webStyles.heroCardMode,
                  ]}
                  onPress={heroGame ? () => onSelectGame(heroGame) : undefined}
                  disabled={!heroGame}
                >
                  {heroGame && heroIsPoster ? (
                    <View style={webStyles.heroPosterLayer}>
                      <GameCard
                        game={heroGame}
                        containerStyle={[webStyles.heroPosterCard, { width: heroPosterWidth }]}
                      />
                    </View>
                  ) : heroCover ? (
                    <Image source={{ uri: heroCover }} style={webStyles.heroImage} />
                  ) : (
                    <View style={webStyles.heroGloss}>
                      <Ionicons name="play" color="#d1d5db" size={32} />
                    </View>
                  )}
                  <View
                    style={[webStyles.heroOverlay, heroIsPoster && webStyles.heroOverlayPoster]}
                  >
                    <Text style={[webStyles.heroTag, heroIsPoster && webStyles.heroTagPoster]}>
                      Trending Now
                    </Text>
                    <Text
                      style={[webStyles.heroTitle, heroIsPoster && webStyles.heroTitlePoster]}
                    >
                      {heroGame?.name ?? 'Discover something new'}
                    </Text>
                    <Text
                      style={[
                        webStyles.heroSubtitle,
                        heroIsPoster && webStyles.heroSubtitlePoster,
                      ]}
                    >
                      {heroGame
                        ? 'Click to learn more about this pick.'
                        : 'Stay tuned for curated picks.'}
                    </Text>
                  </View>
                  <View style={[webStyles.heroDots, heroIsPoster && webStyles.heroDotsPoster]}>
                    {heroItems.map((_, idx) => (
                      <View
                        key={`web-dot-${idx}`}
                        style={[webStyles.heroDot, idx === heroIndex && webStyles.heroDotActive]}
                      />
                    ))}
                  </View>
                </Pressable>
              </Animated.View>
              {!sizes.isSM && (
                <View style={[webStyles.sideCard, { height: sizes.heroH, width: sizes.sideW }]}>
                  {secondaryCover ? (
                    <Image source={{ uri: secondaryCover }} style={webStyles.sideImage} />
                  ) : (
                    <View style={webStyles.sideGloss}>
                      <Ionicons name="sparkles" color="#d1d5db" size={24} />
                    </View>
                  )}
                  <View style={webStyles.sideOverlay}>
                    <Text style={webStyles.sideLabel}>Up Next</Text>
                    <Text style={webStyles.sideTitle}>
                      {secondaryGame?.name ?? 'More games coming up'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {hasActiveSearch ? (
            <View style={webStyles.searchResults}>
              {searchResultsProps.query ? (
                <Text style={webStyles.resultsHeading}>
                  Results for “{searchResultsProps.query}”
                </Text>
              ) : null}
              <SearchMetaBar tone="dark" sortControls={sortControls} />
              <SearchResults {...searchResultsProps} />
            </View>
          ) : (
            <>
              {discoveryBlocks.map((block) =>
                block.type === 'section' ? (
                  <View key={block.section.key}>
                    <SectionTitle title={block.section.title} tight={sizes.isSM} />
                    <Carousel itemWidth={sizes.ITEM_WIDTH} itemGap={sizes.ITEM_GAP}>
                      {resolveGames(block.section, placeholders).map((game, index) => (
                        <WebGameCard
                          key={
                            game
                              ? `${block.section.key}-${game.id}`
                              : `${block.section.key}-placeholder-${index}`
                          }
                          width={sizes.ITEM_WIDTH}
                          game={game}
                          onPress={game ? () => onSelectGame(game) : undefined}
                        />
                      ))}
                    </Carousel>
                  </View>
                ) : (
                  <WebInlineAd key={block.key} />
                )
              )}
              <DiscoveryStatus state={discoveryState} />
            </>
          )}
        </View>
        <Footer sizes={sizes} />
      </ScrollView>
    </View>
  );
}

function NativeSection({
  section,
  placeholders,
  itemWidth,
  itemGap,
  onSelectGame,
}: {
  section: DiscoverySection;
  placeholders: unknown[];
  itemWidth: number;
  itemGap: number;
  onSelectGame: (game: GameSummary) => void;
}) {
  const data = resolveGames(section, placeholders);

  return (
    <View style={nativeStyles.section}>
      <Text style={nativeStyles.sectionTitle}>{section.title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={itemWidth + itemGap}
      >
        <View style={{ flexDirection: 'row' }}>
          {data.map((game, index) => (
            <View
              key={game ? `${section.key}-${game.id}` : `${section.key}-placeholder-${index}`}
              style={{ marginRight: index === data.length - 1 ? 0 : itemGap }}
            >
              <NativeGameCard
                width={itemWidth}
                game={game}
                onPress={game ? () => onSelectGame(game) : undefined}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function NativeInlineAd() {
  return (
    <View style={nativeStyles.inlineAd}>
      <View style={nativeStyles.inlineAdBadge}>
        <Text style={nativeStyles.inlineAdBadgeLabel}>SPONSORED</Text>
      </View>
      <Text style={nativeStyles.inlineAdTitle}>Partner highlight</Text>
      <Text style={nativeStyles.inlineAdCopy}>
        Reserve this space for affiliate drops or campaigns you want to surface between rows.
      </Text>
      <Pressable style={nativeStyles.inlineAdButton}>
        <Text style={nativeStyles.inlineAdButtonLabel}>Learn more</Text>
      </Pressable>
    </View>
  );
}

function NativeGameCard({
  width,
  game,
  onPress,
}: {
  width: number;
  game?: GameSummary | null;
  onPress?: () => void;
}) {
  const placeholderTitle = game?.name ?? 'Coming soon';

  if (game) {
    return (
      <GameCard
        game={game}
        onPress={onPress}
        containerStyle={[nativeStyles.posterCard, { width }]}
      />
    );
  }

  const cardBase = [nativeStyles.card, { width }];

  return (
    <View style={cardBase}>
      <NativeCardContent
        coverUri={undefined}
        platformIcons={[]}
        ratingDisplay={null}
        game={{ id: -1, name: placeholderTitle }}
      />
    </View>
  );
}

function NativeCardContent({
  coverUri,
  platformIcons,
  ratingDisplay,
  game,
}: {
  coverUri?: string;
  platformIcons: Array<keyof typeof Ionicons.glyphMap>;
  ratingDisplay: string | null;
  game?: GameSummary | null;
}) {
  return (
    <>
      <View style={nativeStyles.thumbnail}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={nativeStyles.thumbnailImage} />
        ) : (
          <View style={nativeStyles.thumbnailFallback}>
            <Text style={nativeStyles.thumbText}>Image</Text>
          </View>
        )}
      </View>
      <Text style={nativeStyles.gameTitle} numberOfLines={1}>
        {game?.name ?? 'Coming soon'}
      </Text>
      {ratingDisplay ? (
        <Text style={nativeStyles.rating}>
          <Ionicons name="star" size={12} color="#facc15" /> {ratingDisplay}/10
        </Text>
      ) : (
        <Text style={nativeStyles.ratingPlaceholder}>Rating unavailable</Text>
      )}
      {platformIcons.length ? (
        <View style={nativeStyles.platformRow}>
          {platformIcons.map((icon) => (
            <Ionicons
              key={`${game?.id ?? 'placeholder'}-${icon}`}
              name={icon}
              size={16}
              color="#cbd5f5"
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function WebGameCard({
  width,
  game,
  onPress,
}: {
  width: number;
  game?: GameSummary | null;
  onPress?: () => void;
}) {
  const placeholderTitle = game?.name ?? 'Coming soon';

  if (game) {
    return (
      <GameCard
        game={game}
        onPress={onPress}
        containerStyle={[webStyles.posterCard, { width }]}
      />
    );
  }

  const baseStyle = [webStyles.card, { width }];

  return (
    <View style={baseStyle}>
      <View style={webStyles.thumbWrap}>
        <View style={webStyles.thumbFallback}>
          <Text style={webStyles.thumbText}>Image</Text>
        </View>
      </View>
      <Text style={webStyles.gameName} numberOfLines={1}>
        {placeholderTitle}
      </Text>
      <View style={webStyles.metaRow}>
        <Ionicons name="star" size={12} color="#facc15" />
        <Text style={webStyles.metaText}>N/A</Text>
      </View>
      <View style={webStyles.platformRow}>
        <Ionicons name="game-controller" size={16} color="#e0e7ff" />
        <Ionicons name="logo-windows" size={16} color="#e0e7ff" />
      </View>
    </View>
  );
}

function WebInlineAd() {
  return (
    <View style={webStyles.inlineAd}>
      <View style={webStyles.inlineAdBadge}>
        <Text style={webStyles.inlineAdBadgeLabel}>Sponsored</Text>
      </View>
      <Text style={webStyles.inlineAdTitle}>Curated partner pick</Text>
      <Text style={webStyles.inlineAdCopy}>
        Drop an affiliate CTA here without breaking the rhythm of the discovery grid.
      </Text>
      <View style={webStyles.inlineAdButton}>
        <Text style={webStyles.inlineAdButtonLabel}>Shop now</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title, tight }: { title: string; tight?: boolean }) {
  return (
    <View style={[webStyles.sectionTitleWrap, tight && { marginTop: 2, marginBottom: 8 }]}>
      <View style={webStyles.sectionDivider} />
      <Text style={[webStyles.sectionTitle, tight && { fontSize: 18 }]}>{title}</Text>
      <View style={webStyles.sectionDivider} />
    </View>
  );
}

function Carousel({
  children,
  itemWidth,
  itemGap = 16,
}: {
  children: React.ReactNode;
  itemWidth: number;
  itemGap?: number;
}) {
  const EDGE = 16;
  const entries = React.Children.toArray(children);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: EDGE }}
      snapToAlignment="start"
      decelerationRate="fast"
      snapToInterval={itemWidth + itemGap}
    >
      <View style={{ flexDirection: 'row' }}>
        {entries.map((child, index) => (
          <View
            key={(child as any)?.key ?? `carousel-${index}`}
            style={{ marginRight: index === entries.length - 1 ? 0 : itemGap }}
          >
            {child}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Footer({ sizes }: { sizes: ReturnType<typeof useHomeScreen>['sizes'] }) {
  const router = useRouter();
  const quickLinks = [
    { label: 'Home', route: '/(tabs)/home' },
    { label: 'Favourites', route: '/(tabs)/fav' },
    { label: 'Profile', route: '/(tabs)/profile' },
  ];

  return (
    <View style={webStyles.footerOuter}>
      <View style={[webStyles.footer, { maxWidth: sizes.MAX_WIDTH, paddingHorizontal: sizes.SHELL_PADDING }]}>
        <View style={[webStyles.footerGrid, { columnGap: 32, rowGap: 18 }]}>
          <View style={webStyles.footerColWide}>
            <Text style={webStyles.footerTitle}>Playlog</Text>
            <Text style={webStyles.footerTag}>Track. Discover. Play.</Text>
            <View style={webStyles.socialRow}>
              <IconPill name="logo-twitter" />
              <IconPill name="logo-instagram" />
              <IconPill name="logo-facebook" />
            </View>
          </View>
          <View style={webStyles.footerCol}>
            <Text style={webStyles.footerHeading}>Quick Links</Text>
            {quickLinks.map(({ label, route }) => (
              <FooterLink key={label} label={label} onPress={() => router.push(route)} />
            ))}
          </View>
          <View style={webStyles.footerCol}>
            <Text style={webStyles.footerHeading}>Company</Text>
            <FooterLink label="About us" />
            <FooterLink label="Terms & Conditions" />
            <FooterLink label="Privacy Policy" />
          </View>
          <View style={webStyles.footerCol}>
            <Text style={webStyles.footerHeading}>Contact</Text>
            <Text style={webStyles.footerText}>
              <Ionicons name="mail" size={12} color="#94a3b8" /> info@playlog.com.au
            </Text>
            <Text style={webStyles.footerText}>
              <Ionicons name="location" size={12} color="#94a3b8" /> Sydney, Australia
            </Text>
          </View>
        </View>
        <View style={webStyles.footerDivider} />
        <View style={webStyles.footerBase}>
          <Text style={webStyles.footerSmall}>© {new Date().getFullYear()} Playlog</Text>
          <Text style={webStyles.footerSmall}>All rights reserved</Text>
        </View>
      </View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress?: () => void }) {
  if (!onPress) {
    return <Text style={webStyles.footerLink}>{label}</Text>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
      <Text style={webStyles.footerLink}>{label}</Text>
    </Pressable>
  );
}

function IconPill({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={webStyles.socialBtn}>
      <Ionicons name={name} size={16} color="#cbd5e1" />
    </View>
  );
}

function SearchMetaBar({
  tone = 'light',
  sortControls,
}: {
  tone?: 'light' | 'dark';
  sortControls: SortControls;
}) {
  const {
    sortValue,
    onChangeSort,
    counts: { showing, total },
  } = sortControls;
  const summary =
    total > 0 ? `Showing ${Math.min(showing, total)} of ${total} results` : 'No results yet';

  return (
    <View style={[metaStyles.wrapper, tone === 'dark' && metaStyles.wrapperDark]}>
      <CategoryDropdown
        label="Sort"
        options={SORT_OPTIONS}
        selectedValue={sortValue}
        onSelect={(value) => onChangeSort((value as SortValue) ?? 'relevance')}
        tone={tone}
        containerStyle={metaStyles.dropdown}
      />
      <Text style={[metaStyles.countText, tone === 'dark' && metaStyles.countTextDark]}>{summary}</Text>
    </View>
  );
}

type CategoryDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (selection: FilterSelection) => void;
  filterControls: FilterControls;
};

function CategoryDrawer({ visible, onClose, onSelectCategory, filterControls }: CategoryDrawerProps) {
  const { filters, options, filtersActive } = filterControls;
  const [renderDrawer, setRenderDrawer] = useState(visible);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(CATEGORY_DRAWER_WIDTH, Dimensions.get('window').width * 0.9);

  useEffect(() => {
    if (visible) {
      setRenderDrawer(true);
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!visible && finished) {
        setRenderDrawer(false);
      }
    });
  }, [slideAnim, visible]);

  const [activeCategory, setActiveCategory] = useState<'platform' | 'genre' | 'release'>('platform');

  useEffect(() => {
    if (!visible) return;
    if (filters.platform) {
      setActiveCategory('platform');
    } else if (filters.genre) {
      setActiveCategory('genre');
    } else if (filters.release !== 'any') {
      setActiveCategory('release');
    } else {
      setActiveCategory('platform');
    }
  }, [filters, visible]);

  const parentItems = useMemo(
    () => [
      {
        key: 'platform',
        label: 'By platform',
        description: 'Nintendo Switch, PlayStation, PC, Xbox…',
        hasChildren: true,
      },
      {
        key: 'genre',
        label: 'By genre',
        description: 'Action, RPG, strategy, indie hits and more.',
        hasChildren: true,
      },
      {
        key: 'release',
        label: 'By release year',
        description: 'Newest launches or retro favorites.',
        hasChildren: true,
      },
    ],
    []
  );

  const childOptions = useMemo(() => {
    switch (activeCategory) {
      case 'platform':
        return options.platforms;
      case 'genre':
        return options.genres;
      case 'release':
        return options.releases;
      default:
        return [];
    }
  }, [activeCategory, options.platforms, options.genres, options.releases]);

  const handleChildSelect = useCallback(
    (option: FilterOption | ReleaseFilterOption) => {
      if (activeCategory === 'platform') {
        onSelectCategory({
          type: 'platform',
          value: option.value as string | null,
          label: option.label,
        });
        return;
      }
      if (activeCategory === 'genre') {
        onSelectCategory({
          type: 'genre',
          value: option.value as number | null,
          label: option.label,
        });
        return;
      }
      onSelectCategory({
        type: 'release',
        value: option.value as ReleaseFilterValue,
        label: option.label,
      });
    },
    [activeCategory, onSelectCategory]
  );

  const handleClear = useCallback(() => {
    const defaultOption =
      activeCategory === 'platform'
        ? options.platforms[0]
        : activeCategory === 'genre'
        ? options.genres[0]
        : options.releases[0];
    if (!defaultOption) return;
    handleChildSelect(defaultOption);
  }, [activeCategory, handleChildSelect, options.genres, options.platforms, options.releases]);

  if (!renderDrawer) {
    return null;
  }

  const summary = getCategorySummary(filters, options);
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return (
    <Modal
      visible={renderDrawer}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={drawerStyles.modalRoot}>
        <Animated.View style={[drawerStyles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            drawerStyles.panel,
            {
              width: drawerWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={drawerStyles.header}>
            <View style={drawerStyles.headerCopy}>
              <Text style={drawerStyles.title}>Categories</Text>
              <Text style={drawerStyles.subtitle}>
                {filtersActive ? summary : 'Choose a platform, genre, or release window'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={drawerStyles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="#f8fafc" />
            </Pressable>
          </View>
          <View style={drawerStyles.menuBody}>
            <View style={[searchMenuStyles.parentColumn, drawerStyles.menuColumn]}>
              {parentItems.map((item) => {
                const isActive = activeCategory === item.key;
                const hasSelection =
                  (item.key === 'platform' && filters.platform) ||
                  (item.key === 'genre' && filters.genre) ||
                  (item.key === 'release' && filters.release !== 'any');
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setActiveCategory(item.key as 'platform' | 'genre' | 'release')}
                    style={[
                      searchMenuStyles.parentItem,
                      isActive && searchMenuStyles.parentItemActive,
                    ]}
                  >
                    <View style={searchMenuStyles.parentRow}>
                      <Text
                        style={[
                          searchMenuStyles.parentLabel,
                          isActive && searchMenuStyles.parentLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {hasSelection ? <Text style={searchMenuStyles.badge}>Selected</Text> : null}
                    </View>
                    <Text style={searchMenuStyles.parentDescription}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[searchMenuStyles.childColumn, drawerStyles.menuColumn]}>
              <View style={searchMenuStyles.childHeader}>
                <Text style={searchMenuStyles.childTitle}>
                  {activeCategory === 'platform'
                    ? 'Select a platform'
                    : activeCategory === 'genre'
                    ? 'Select a genre'
                    : 'Select a release window'}
                </Text>
              </View>
              <ScrollView
                style={searchMenuStyles.childScroll}
                contentContainerStyle={searchMenuStyles.childScrollContent}
              >
                {childOptions.map((option) => {
                  const isSelected =
                    activeCategory === 'platform'
                      ? filters.platform === option.value
                      : activeCategory === 'genre'
                      ? filters.genre === option.value
                      : filters.release === option.value;
                  return (
                    <Pressable
                      key={`${activeCategory}-${String(option.value ?? 'all')}`}
                      style={[
                        searchMenuStyles.childItem,
                        isSelected && searchMenuStyles.childItemSelected,
                      ]}
                      onPress={() => handleChildSelect(option)}
                    >
                      <Text
                        style={[
                          searchMenuStyles.childLabel,
                          isSelected && searchMenuStyles.childLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={handleClear} style={searchMenuStyles.clearInline} hitSlop={8}>
                  <Text style={searchMenuStyles.clearLink}>Clear</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CategoryDropdown({
  label,
  options,
  selectedValue,
  onSelect,
  tone,
  containerStyle,
}: {
  label: string;
  options: FilterOption[] | ReleaseFilterOption[];
  selectedValue: string | number | null;
  onSelect: (value: string | number | null) => void;
  tone: 'light' | 'dark';
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === selectedValue);

  if (!options.length) return null;
  return (
    <View style={[filterStyles.dropdown, containerStyle]}>
      <Text style={[filterStyles.groupLabel, tone === 'dark' && filterStyles.groupLabelDark]}>
        {label}
      </Text>
      <View style={filterStyles.dropdownControl}>
        <Pressable
          onPress={() => setOpen((prev) => !prev)}
          style={[
            filterStyles.dropdownButton,
            tone === 'dark' && filterStyles.dropdownButtonDark,
            open && filterStyles.dropdownButtonActive,
          ]}
        >
          <Text
            style={[
              filterStyles.dropdownValue,
              tone === 'dark' && filterStyles.dropdownValueDark,
              !selectedOption && filterStyles.dropdownPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedOption?.label ?? 'All'}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={tone === 'dark' ? '#e5e7eb' : '#374151'}
          />
        </Pressable>
        {open ? (
          <View style={[filterStyles.dropdownMenu, tone === 'dark' && filterStyles.dropdownMenuDark]}>
            <ScrollView showsVerticalScrollIndicator={true} style={filterStyles.dropdownScroll}>
              {options.map((option) => {
                const isActive = selectedValue === option.value;
                return (
                  <Pressable
                    key={`${label}-${String(option.value ?? 'all')}`}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    style={[
                      filterStyles.menuItem,
                      tone === 'dark' && filterStyles.menuItemDark,
                      isActive && filterStyles.menuItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        filterStyles.menuItemText,
                        tone === 'dark' && filterStyles.menuItemTextDark,
                        isActive && filterStyles.menuItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DiscoveryStatus({ state }: { state: DiscoveryState }) {
  if (state.exploreLoading) {
    return (
      <View style={statusStyles.container}>
        <ActivityIndicator color="#818cf8" />
        <Text style={statusStyles.label}>Loading sections…</Text>
      </View>
    );
  }
  if (state.exploreError) {
    return (
      <View style={statusStyles.container}>
        <Text style={statusStyles.error}>{state.exploreError}</Text>
      </View>
    );
  }
  return null;
}

function resolveCoverUri(raw?: string | null) {
  if (!raw) return undefined;
  const normalized = normalizeCoverSize(raw);
  return normalized.startsWith('http') ? normalized : `https:${normalized}`;
}

function resolveHeroUri(game?: GameSummary | null) {
  if (!game) return undefined;
  if (game.mediaUrl) {
    const media = normalizeCoverSize(game.mediaUrl);
    if (media.startsWith('http')) return media;
    if (media.startsWith('//')) return `https:${media}`;
    return media;
  }
  return resolveCoverUri(game.cover?.url ?? null);
}

function shouldUsePosterLayout(game?: GameSummary | null) {
  if (!game) return false;
  const source = (game.mediaUrl ?? game.cover?.url ?? '')?.toLowerCase();
  if (!source) return false;
  const fileToken = source.split('/').pop()?.split('.')[0] ?? '';
  if (fileToken.startsWith('co') || source.includes('/cover') || source.includes('t_cover')) {
    return true;
  }
  if (!game.mediaUrl) return true;
  return false;
}

function normalizeCoverSize(raw: string) {
  if (!raw.includes('t_')) return raw;
  return raw.replace(/t_thumb|t_cover_small|t_cover_big|t_screenshot_med|t_screenshot_big/g, (match) => {
    if (match.startsWith('t_screenshot')) {
      return 't_screenshot_huge';
    }
    return 't_cover_big_2x';
  });
}

function formatRating(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return (value / 10).toFixed(1);
}

function resolveGames(section: DiscoverySection, placeholders: unknown[]) {
  if (section.games && section.games.length > 0) {
    return section.games;
  }
  return placeholders.map(() => null);
}

function getColumnCount(width: number) {
  if (width >= 1400) return 5;
  if (width >= 1100) return 4;
  if (width >= 900) return 3;
  if (width >= 640) return 2;
  return 1;
}

function shuffleGames(items: GameSummary[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCategorySummary(filters: FilterState, options: CategoryFilterOptions) {
  if (filters.platform) {
    const match = options.platforms.find((option) => option.value === filters.platform);
    return `Platform: ${match?.label ?? filters.platform}`;
  }
  if (filters.genre) {
    const match = options.genres.find((option) => option.value === filters.genre);
    return `Genre: ${match?.label ?? filters.genre}`;
  }
  if (filters.release !== 'any') {
    const match = options.releases.find((option) => option.value === filters.release);
    return `Release: ${match?.label ?? filters.release}`;
  }
  return 'All categories';
}

function filterGames(games: GameSummary[], filters: FilterState) {
  return games.filter((game) => {
    if (filters.platform) {
      const hasPlatform = (game.platforms ?? []).some(
        (platform) =>
          platform?.slug === filters.platform || platform?.abbreviation === filters.platform
      );
      if (!hasPlatform) {
        return false;
      }
    }

    if (filters.genre) {
      const hasGenre = (game.genres ?? []).some((genre) => genre?.id === filters.genre);
      if (!hasGenre) {
        return false;
      }
    }

    if (filters.release !== 'any') {
      const year = getReleaseYear(game);
      if (!year) {
        return false;
      }
      if (filters.release === 'recent') {
        const currentYear = new Date().getFullYear();
        if (year < currentYear - 1) {
          return false;
        }
      } else if (filters.release.startsWith('decade-')) {
        const decade = Number(filters.release.split('-')[1]);
        if (Number.isNaN(decade) || year < decade || year > decade + 9) {
          return false;
        }
      }
    }

    return true;
  });
}

function sortGames(games: GameSummary[], sort: SortValue) {
  if (sort === 'relevance') {
    return games;
  }
  const next = [...games];
  const byRating = (a: GameSummary, b: GameSummary) => {
    const ratingA = typeof a.rating === 'number' ? a.rating : -1;
    const ratingB = typeof b.rating === 'number' ? b.rating : -1;
    return ratingA - ratingB;
  };
  const byRelease = (a: GameSummary, b: GameSummary) => {
    const dateA = typeof a.first_release_date === 'number' ? a.first_release_date : 0;
    const dateB = typeof b.first_release_date === 'number' ? b.first_release_date : 0;
    return dateA - dateB;
  };

  switch (sort) {
    case 'rating-desc':
      next.sort((a, b) => byRating(b, a));
      break;
    case 'rating-asc':
      next.sort(byRating);
      break;
    case 'release-desc':
      next.sort((a, b) => byRelease(b, a));
      break;
    case 'release-asc':
      next.sort(byRelease);
      break;
    default:
      break;
  }

  return next;
}

function getReleaseYear(game: GameSummary) {
  if (!game.first_release_date) {
    return null;
  }
  const year = new Date(game.first_release_date * 1000).getFullYear();
  return Number.isNaN(year) ? null : year;
}

const PLATFORM_ICON_MAP: Array<{ match: RegExp; icon: keyof typeof Ionicons.glyphMap }> = [
  { match: /(pc|win|windows)/i, icon: 'logo-windows' },
  { match: /(xbox)/i, icon: 'logo-xbox' },
  { match: /(playstation|ps[1-5]|psp|vita)/i, icon: 'logo-playstation' },
  { match: /(nintendo|switch)/i, icon: 'game-controller' },
  { match: /(mac|apple|ios)/i, icon: 'logo-apple' },
  { match: /(android)/i, icon: 'logo-android' },
  { match: /(linux|steam)/i, icon: 'desktop-outline' },
];

function getPlatformIcons(game?: GameSummary | null) {
  if (!game?.platforms?.length) return [];
  const icons = new Set<keyof typeof Ionicons.glyphMap>();
  game.platforms.forEach((platform) => {
    const slug = platform.slug ?? platform.abbreviation ?? '';
    const entry = PLATFORM_ICON_MAP.find(({ match }) => match.test(slug));
    if (entry) icons.add(entry.icon);
  });
  return Array.from(icons);
}

const nativeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  logoBox: { backgroundColor: '#2e2e2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  logoBoxPressed: { opacity: 0.8 },
  logoMark: { width: 60, height: 24 },
  searchBox: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { color: '#fff', flex: 1, fontSize: 14, paddingVertical: 6 },
  categoryButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1f2f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginLeft: 4,
    marginRight: 8,
  },
  categoryButtonActive: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(37,99,235,0.25)',
  },
  profileBox: { backgroundColor: '#2e2e2e', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 6 },
  profileText: { color: '#fff', fontSize: 10 },
  hero: { alignItems: 'center', marginVertical: 16, gap: 10 },
  heroAnimatedWrap: { width: '90%' },
  heroBanner: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#18181b',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBannerPoster: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f3f46',
  },
  heroPosterLayer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroPosterCard: {
    width: '70%',
    maxWidth: 220,
  },
  heroOverlay: { padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroOverlayPoster: {
    backgroundColor: 'transparent',
    marginTop: 16,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  heroTag: { color: '#cbd5f5', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroTagPoster: { alignSelf: 'center' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  heroTitlePoster: { textAlign: 'center' },
  heroSubtitle: { color: '#e5e7eb', fontSize: 13, marginTop: 4 },
  heroSubtitlePoster: { textAlign: 'center' },
  heroDots: { flexDirection: 'row', gap: 6 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroDotActive: { backgroundColor: '#fff' },
  sectionsContainer: { gap: 16, paddingTop: 8 },
  section: { marginBottom: 8 },
  inlineAd: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: '#101828',
    gap: 10,
  },
  inlineAdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.2)',
  },
  inlineAdBadgeLabel: { color: '#cbd5f5', fontWeight: '700', fontSize: 11, letterSpacing: 0.6 },
  inlineAdTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  inlineAdCopy: { color: '#cbd5f5', fontSize: 13, lineHeight: 18 },
  inlineAdButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  inlineAdButtonLabel: { color: '#f8fafc', fontWeight: '700' },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    borderBottomColor: '#333',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  posterCard: { width: '100%' },
  card: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12, gap: 8 },
  thumbnail: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 14,
    backgroundColor: '#1c1c1f',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbText: { color: '#ccc' },
  gameTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rating: { color: '#ccc', fontSize: 12, marginVertical: 4 },
  ratingPlaceholder: { color: '#6b7280', fontSize: 12, marginVertical: 4 },
  platformRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  searchResults: { paddingHorizontal: 16 },
  resultsHeading: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSubtitle: { color: '#cbd5e1', fontSize: 13, marginBottom: 16 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalPrimary: { backgroundColor: '#9ca3af' },
  modalSecondary: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modalPrimaryText: { color: '#0b0b0c', fontSize: 14, fontWeight: '800' },
  modalSecondaryText: { color: '#e5e7eb', fontSize: 14, fontWeight: '700' },
  modalDismiss: { alignItems: 'center', marginTop: 8 },
  modalDismissText: { color: '#94a3b8', fontSize: 12 },
});

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingBottom: 48 },
  shell: { alignSelf: 'center', width: '100%', paddingTop: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 24 },
  heroAnimatedWrap: { flex: 1 },
  heroCard: { borderRadius: 18, backgroundColor: '#111827', overflow: 'hidden', flex: 1 },
  heroCardMode: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroGloss: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  heroPosterLayer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  heroPosterCard: {
    width: '70%',
    maxWidth: 320,
  },
  heroOverlay: { marginTop: 'auto', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroOverlayPoster: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 0,
  },
  heroTag: { color: '#cbd5f5', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  heroTagPoster: { alignSelf: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 8 },
  heroTitlePoster: { textAlign: 'center' },
  heroSubtitle: { color: '#e5e7eb', fontSize: 14, marginTop: 6 },
  heroSubtitlePoster: { textAlign: 'center' },
  heroDots: { flexDirection: 'row', gap: 6, padding: 12 },
  heroDotsPoster: { alignSelf: 'center' },
  heroDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroDotActive: { backgroundColor: '#fff' },
  sideCard: { borderRadius: 18, backgroundColor: '#1f2937', overflow: 'hidden' },
  sideImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  sideGloss: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  sideOverlay: { marginTop: 'auto', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  sideLabel: { color: '#cbd5f5', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  sideTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  searchResults: { marginBottom: 24 },
  resultsHeading: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionTitleWrap: { alignItems: 'center', marginTop: 6, marginBottom: 14 },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.2, marginBottom: 8 },
  posterCard: { width: '100%' },
  inlineAd: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: '#111827',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  inlineAdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79,70,229,0.25)',
  },
  inlineAdBadgeLabel: { color: '#cbd5f5', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  inlineAdTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  inlineAdCopy: { color: '#cbd5f5', fontSize: 14, lineHeight: 20 },
  inlineAdButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  inlineAdButtonLabel: { color: '#f8fafc', fontWeight: '700' },
  card: {
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2c2c30',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbText: { color: '#d1d5db', fontSize: 12 },
  gameName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: '#e5e7eb', fontSize: 12 },
  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  footerOuter: {
    backgroundColor: '#0c0f18',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
    marginTop: 28,
  },
  footer: { alignSelf: 'center', width: '100%', paddingTop: 22, paddingBottom: 30 },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  footerColWide: { minWidth: 240, gap: 8, flexShrink: 0 },
  footerCol: { minWidth: 160, gap: 8, flexShrink: 0 },
  footerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  footerTag: { color: '#94a3b8', fontSize: 12 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  socialBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  footerHeading: { color: '#e5e7eb', fontWeight: '800', marginBottom: 6, fontSize: 13 },
  footerLink: { color: '#cbd5e1', textDecorationLine: 'underline', fontSize: 13 },
  footerText: { color: '#94a3b8', fontSize: 13 },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 18,
    marginBottom: 12,
  },
  footerBase: { flexDirection: 'row', justifyContent: 'space-between' },
  footerSmall: { color: '#64748b', fontSize: 12 },
});

const statusStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  label: { marginTop: 8, color: '#cbd5f5' },
  error: { color: '#fca5a5' },
});

const filterStyles = StyleSheet.create({
  dropdown: { flexBasis: '30%', flexGrow: 1, minWidth: 150 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  groupLabelDark: { color: '#cbd5f5' },
  dropdownControl: { marginTop: 6, position: 'relative' },
  dropdownButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  dropdownButtonDark: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownButtonActive: {
    borderColor: '#6366f1',
  },
  dropdownValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 12 },
  dropdownValueDark: { color: '#f8fafc' },
  dropdownPlaceholder: { color: '#9ca3af' },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    maxHeight: 220,
  },
  dropdownMenuDark: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dropdownScroll: { maxHeight: 220 },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  menuItemDark: { borderBottomColor: 'rgba(255,255,255,0.08)' },
  menuItemActive: { backgroundColor: 'rgba(99,102,241,0.1)' },
  menuItemText: { fontSize: 14, color: '#111827' },
  menuItemTextDark: { color: '#e5e7eb' },
  menuItemTextActive: { fontWeight: '700', color: '#4f46e5' },
});

const metaStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  wrapperDark: {},
  dropdown: { flexBasis: '40%', flexGrow: 0 },
  countText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  countTextDark: { color: '#cbd5f5' },
});

const searchMenuStyles = StyleSheet.create({
  parentColumn: { flex: 1, padding: 16, backgroundColor: 'rgba(15,23,42,0.95)' },
  parentItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, marginBottom: 8 },
  parentItemActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  parentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentLabel: { color: '#e2e8f0', fontWeight: '700' },
  parentLabelActive: { color: '#fff' },
  parentDescription: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  badge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  childColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    backgroundColor: '#111827',
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingRight: 0,
  },
  childTitle: { color: '#f8fafc', fontWeight: '900', fontSize: 18 },
  clearLink: {
    color: '#bfdbff',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  childScroll: { marginTop: 12 },
  childScrollContent: { paddingBottom: 16 },
  childItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  childItemSelected: { backgroundColor: 'rgba(99,102,241,0.3)' },
  childLabel: { color: '#e5e7eb', fontWeight: '600' },
  childLabelSelected: { color: '#fff' },
  clearInline: { marginTop: 12, alignSelf: 'flex-start' },
});

const drawerStyles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#050a16',
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerCopy: { flex: 1, marginRight: 12 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#cbd5f5', fontSize: 12, marginTop: 4, lineHeight: 16 },
  closeBtn: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  menuBody: { flexDirection: 'row', flex: 1, gap: 12 },
  menuColumn: { flex: 1 },
});
