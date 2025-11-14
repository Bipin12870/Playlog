import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { GameCard } from '../../components/GameCard';
import { SearchResults } from '../../components/home';
import type { DiscoverySection } from '../../components/home/DiscoverySections';
import {
  fetchFeaturedGames,
  fetchRandomGames,
  fetchTrendingGames,
  searchGames,
} from '../../lib/igdb';
import { useHomeScreen } from './useHomeScreen';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useDiscoveryCache } from '../../lib/hooks/useDiscoveryCache';
import type { GameSummary } from '../../types/game';

const LOGO = require('../../assets/logo.png');

type HeroGame = GameSummary | null;
type HeroAnimatedStyle = Animated.WithAnimatedValue<ViewStyle>;

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
  const { cacheReady: discoveryCacheReady, getCachedDiscovery, cacheDiscovery } = useDiscoveryCache();

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
        (result) => result.status === 'rejected'
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
      setLoading(false);
      setActiveQuery('');
      setGames([]);
      setError(null);
      return;
    }
    if (!cacheReady) {
      setLoading(true);
      return;
    }
    fetchGames(trimmed);
  }, [submittedTerm, submissionId, fetchGames, cacheReady]);

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

  const hasActiveSearch = Boolean(activeQuery);

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
    games,
    loading,
    error,
    columnCount,
    onSelect: handleViewDetails,
    theme: 'dark' as const,
    cardVariant,
    query: activeQuery,
  };

  const discoveryState = {
    exploreLoading,
    exploreError,
  };

  if (isWeb) {
    return (
      <WebHome
        sizes={sizes}
        placeholders={placeholders}
        sections={sections}
        hasActiveSearch={hasActiveSearch}
        searchResultsProps={searchResultsProps}
        discoveryState={discoveryState}
        onSelectGame={handleViewDetails}
        heroItems={heroItems}
        heroIndex={heroIndex}
        heroAnimatedStyle={heroAnimatedStyle}
      />
    );
  }

  return (
    <NativeHome
      sizes={sizes}
      placeholders={placeholders}
      sections={sections}
      hasActiveSearch={hasActiveSearch}
      searchResultsProps={searchResultsProps}
      discoveryState={discoveryState}
      searchInputProps={searchInputProps}
      onSelectGame={handleViewDetails}
      router={router}
      heroItems={heroItems}
      heroIndex={heroIndex}
      heroAnimatedStyle={heroAnimatedStyle}
    />
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
};

type DiscoveryState = {
  exploreLoading: boolean;
  exploreError: string | null;
};

type HomeSectionProps = {
  sizes: ReturnType<typeof useHomeScreen>['sizes'];
  placeholders: unknown[];
  sections: DiscoverySection[];
  hasActiveSearch: boolean;
  searchResultsProps: SearchResultsProps;
  discoveryState: DiscoveryState;
  onSelectGame: (game: GameSummary) => void;
  heroItems: HeroGame[];
  heroIndex: number;
  heroAnimatedStyle: HeroAnimatedStyle;
};

type NativeHomeProps = HomeSectionProps & {
  searchInputProps: TextInputProps;
  router: ReturnType<typeof useRouter>;
};

function NativeHome({
  sizes,
  placeholders,
  sections,
  hasActiveSearch,
  searchResultsProps,
  discoveryState,
  searchInputProps,
  onSelectGame,
  router,
  heroItems,
  heroIndex,
  heroAnimatedStyle,
}: NativeHomeProps) {
  const { user, initializing } = useAuthUser();
  const [hideGate, setHideGate] = useState(false);
  const showGate = !initializing && !user && !hideGate;
  const heroGame = heroItems[heroIndex] ?? null;
  const heroCover = resolveHeroUri(heroGame);

  return (
    <SafeAreaView style={nativeStyles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={nativeStyles.scrollContent}
      >
        <View style={nativeStyles.header}>
          <View style={nativeStyles.logoBox}>
            <Image source={LOGO} style={nativeStyles.logoMark} resizeMode="contain" />
          </View>
          <View style={nativeStyles.searchBox}>
            <Ionicons name="search" size={16} color="#9ca3af" style={nativeStyles.searchIcon} />
            <TextInput
              {...searchInputProps}
              style={nativeStyles.searchInput}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={nativeStyles.profileBox}>
            <Text style={nativeStyles.profileText}>{user ? 'Profile' : 'Guest'}</Text>
          </View>
        </View>

        {!hasActiveSearch && (
          <View style={nativeStyles.hero}>
            <Animated.View style={[nativeStyles.heroAnimatedWrap, heroAnimatedStyle]}>
              <Pressable
                style={[nativeStyles.heroBanner, { height: sizes.heroH }]}
                onPress={heroGame ? () => onSelectGame(heroGame) : undefined}
                disabled={!heroGame}
              >
                {heroCover ? (
                  <Image source={{ uri: heroCover }} style={nativeStyles.heroImage} />
                ) : (
                  <View style={nativeStyles.heroPlaceholder}>
                    <Ionicons name="arrow-forward-circle-outline" size={28} color="#d1d5db" />
                  </View>
                )}
                <View style={nativeStyles.heroOverlay}>
                  <Text style={nativeStyles.heroTag}>Spotlight</Text>
                  <Text style={nativeStyles.heroTitle}>{
                    heroGame?.name ?? 'Discover new games'
                  }</Text>
                  <Text style={nativeStyles.heroSubtitle}>
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
            <SearchResults {...searchResultsProps} />
          </View>
        ) : (
          <View style={nativeStyles.sectionsContainer}>
            {sections.map((section) => (
              <NativeSection
                key={section.key}
                section={section}
                placeholders={placeholders}
                itemWidth={sizes.ITEM_WIDTH}
                itemGap={sizes.ITEM_GAP}
                onSelectGame={onSelectGame}
              />
            ))}
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
  hasActiveSearch,
  searchResultsProps,
  discoveryState,
  onSelectGame,
  heroItems,
  heroIndex,
  heroAnimatedStyle,
}: WebHomeProps) {
  const heroGame = heroItems[heroIndex] ?? null;
  const heroCover = resolveHeroUri(heroGame);
  const secondaryGame = heroItems.length > 1 ? heroItems[(heroIndex + 1) % heroItems.length] : null;
  const secondaryCover = resolveHeroUri(secondaryGame);

  return (
    <View style={webStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={webStyles.scroll}>
        <View style={[webStyles.shell, { maxWidth: sizes.MAX_WIDTH, paddingHorizontal: sizes.SHELL_PADDING }]}>
          {!hasActiveSearch && (
            <View style={[webStyles.heroRow, { gap: 20, paddingHorizontal: sizes.isSM ? 12 : 16 }]}>
              <Animated.View style={[webStyles.heroAnimatedWrap, heroAnimatedStyle]}>
                <Pressable
                  style={[webStyles.heroCard, { height: sizes.heroH }]}
                  onPress={heroGame ? () => onSelectGame(heroGame) : undefined}
                  disabled={!heroGame}
                >
                  {heroCover ? (
                    <Image source={{ uri: heroCover }} style={webStyles.heroImage} />
                  ) : (
                    <View style={webStyles.heroGloss}>
                      <Ionicons name="play" color="#d1d5db" size={32} />
                    </View>
                  )}
                  <View style={webStyles.heroOverlay}>
                    <Text style={webStyles.heroTag}>Trending Now</Text>
                    <Text style={webStyles.heroTitle}>
                      {heroGame?.name ?? 'Discover something new'}
                    </Text>
                    <Text style={webStyles.heroSubtitle}>
                      {heroGame
                        ? 'Click to learn more about this pick.'
                        : 'Stay tuned for curated picks.'}
                    </Text>
                  </View>
                  <View style={webStyles.heroDots}>
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
              <SearchResults {...searchResultsProps} />
            </View>
          ) : (
            <>
              {sections.map((section) => (
                <View key={section.key}>
                  <SectionTitle title={section.title} tight={sizes.isSM} />
                  <Carousel itemWidth={sizes.ITEM_WIDTH} itemGap={sizes.ITEM_GAP}>
                    {resolveGames(section, placeholders).map((game, index) => (
                      <WebGameCard
                        key={game ? `${section.key}-${game.id}` : `${section.key}-placeholder-${index}`}
                        width={sizes.ITEM_WIDTH}
                        game={game}
                        onPress={game ? () => onSelectGame(game) : undefined}
                      />
                    ))}
                  </Carousel>
                </View>
              ))}
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
            <FooterLink label="Home" />
            <FooterLink label="Favourites" />
            <FooterLink label="Profile" />
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

function FooterLink({ label }: { label: string }) {
  return <Text style={webStyles.footerLink}>{label}</Text>;
}

function IconPill({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={webStyles.socialBtn}>
      <Ionicons name={name} size={16} color="#cbd5e1" />
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
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f3f46',
  },
  heroOverlay: { padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroTag: { color: '#cbd5f5', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  heroSubtitle: { color: '#e5e7eb', fontSize: 13, marginTop: 4 },
  heroDots: { flexDirection: 'row', gap: 6 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroDotActive: { backgroundColor: '#fff' },
  sectionsContainer: { gap: 16, paddingTop: 8 },
  section: { marginBottom: 8 },
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
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroGloss: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  heroOverlay: { marginTop: 'auto', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroTag: { color: '#cbd5f5', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 8 },
  heroSubtitle: { color: '#e5e7eb', fontSize: 14, marginTop: 6 },
  heroDots: { flexDirection: 'row', gap: 6, padding: 12 },
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