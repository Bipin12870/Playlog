import { useMemo } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';

import { GameCard } from '../GameCard';
import { AdBanner } from './AdBanner';
import { GameSummary } from '../../types/game';

type EmptyState = {
  title: string;
  copy: string;
};

type AdItem = {
  kind: 'ad';
  id: string;
  tag?: string;
  title: string;
  copy: string;
  ctaLabel: string;
  href: string;
};

type GridItem = GameSummary | AdItem | null;

type SearchResultsProps = {
  games: GameSummary[];
  loading: boolean;
  error?: string | null;
  columnCount: number;
  onSelect: (game: GameSummary) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  gridRowStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  emptyState?: EmptyState;
  headerComponent?: ReactElement | null;
  footerComponent?: ReactElement | null;
  cardVariant?: 'default' | 'compact';
  query?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  adFrequency?: number | null;
  ads?: AdItem[];
};

export function SearchResults({
  games,
  loading,
  error,
  columnCount,
  onSelect,
  contentContainerStyle,
  gridRowStyle,
  cardStyle,
  emptyState = {
    title: 'No matches found',
    copy: 'Try a different title or check your spelling.',
  },
  headerComponent = null,
  footerComponent = null,
  cardVariant = Platform.OS === 'web' ? 'default' : 'compact',
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  adFrequency: adFrequencyProp = 6,
  ads: adsProp,
}: SearchResultsProps) {
  const isCompact = cardVariant === 'compact';
  const isWeb = Platform.OS === 'web';
  const baseColumns = isWeb ? Math.max(columnCount, 6) : columnCount;
  const resolvedColumnCount = isCompact && baseColumns < 3 ? 3 : baseColumns;

  const adInventory = useMemo<AdItem[]>(
    () =>
      adsProp?.length
        ? adsProp
        : [
            {
              kind: 'ad',
              id: 'prime-video',
              tag: 'Sponsored',
              title: 'Prime Video',
              copy: 'Stream fresh originals, hit movies, and weekly drops in one place.',
              ctaLabel: 'Watch now',
              href: 'https://www.primevideo.com/',
            },
            {
              kind: 'ad',
              id: 'playlog-promote',
              tag: 'Sponsored',
              title: 'Boost your next launch',
              copy: 'Secure premium placement across Playlog and spotlight your studio’s headline release.',
              ctaLabel: 'Reserve placement',
              href: 'https://example.com/advertise',
            },
          ],
    [adsProp],
  );

  const isAdItem = (item: GridItem): item is AdItem =>
    !!item && typeof item === 'object' && 'kind' in item && item.kind === 'ad';

  const data = useMemo<GridItem[]>(() => {
    if (!games.length) return [];
    const shouldInsertAds = typeof adFrequencyProp === 'number' && adFrequencyProp > 0;

    const withAds: GridItem[] = [];
    let adInsertCount = 0;
    games.forEach((game, index) => {
      withAds.push(game);
      if (
        shouldInsertAds &&
        (index + 1) % adFrequencyProp === 0 &&
        index < games.length - 1
      ) {
        const ad = adInventory[adInsertCount % adInventory.length];
        withAds.push({ ...ad, id: `${ad.id}-${adInsertCount}` });
        adInsertCount += 1;
      }
    });

    const remainder = withAds.length % resolvedColumnCount;
    if (remainder === 0) return withAds;
    const placeholders = Array.from({ length: resolvedColumnCount - remainder }, () => null);
    return [...withAds, ...placeholders];
  }, [games, resolvedColumnCount, adFrequencyProp, adInventory]);

  const renderItem: ListRenderItem<GridItem> = ({ item }) => {
    if (!item) {
      return (
        <View
          pointerEvents="none"
          style={[styles.card, isCompact && styles.compactCard, styles.placeholderCard, cardStyle]}
        />
      );
    }

    if (isAdItem(item)) {
      return (
        <View style={[styles.card, isCompact && styles.compactCard, cardStyle]}>
          <AdBanner
            tag={item.tag}
            title={item.title}
            copy={item.copy}
            ctaLabel={item.ctaLabel}
            href={item.href}
          />
        </View>
      );
    }

    return (
      <GameCard
        game={item}
        containerStyle={[styles.card, isCompact && styles.compactCard, cardStyle]}
        onPress={() => onSelect(item)}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const renderFooter = () => {
    if (!hasMore || !onLoadMore) {
      return footerComponent ?? null;
    }
    return (
      <View style={styles.footer}>
        {footerComponent}
        <Pressable
          onPress={onLoadMore}
          disabled={loadingMore}
          style={({ pressed }) => [
            styles.loadMoreBtn,
            pressed && styles.loadMorePressed,
            loadingMore && styles.loadMoreDisabled,
          ]}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#f8fafc" />
          ) : (
            <Text style={styles.loadMoreLabel}>Load more</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.list}
        data={data}
        contentContainerStyle={[
          styles.listContent,
          isCompact && styles.compactListContent,
          contentContainerStyle,
        ]}
        numColumns={resolvedColumnCount}
        keyExtractor={(item, index) => {
          if (!item) return `placeholder-${index}`;
          if ('kind' in item && item.kind === 'ad') {
            return item.id;
          }
          return item.id.toString();
        }}
        columnWrapperStyle={
          resolvedColumnCount > 1
            ? [styles.gridRow, isCompact && styles.compactGridRow, gridRowStyle]
            : undefined
        }
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptyCopy}>{emptyState.copy}</Text>
          </View>
        }
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 48 },
  gridRow: { gap: 20, paddingBottom: 20 },
  compactGridRow: { gap: 12, paddingBottom: 16 },
  card: { flex: 1, marginBottom: 20, minWidth: 0 },
  compactCard: { marginBottom: 16 },
  placeholderCard: { opacity: 0 },
  loadingRow: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  compactListContent: { paddingBottom: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyCopy: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },
  errorText: { marginTop: 12, color: '#ef4444', textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  loadMoreBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  loadMoreLabel: { color: '#f8fafc', fontWeight: '700' },
  loadMorePressed: { opacity: 0.9 },
  loadMoreDisabled: { opacity: 0.7 },
  adCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b1220',
    padding: 16,
    gap: 6,
    justifyContent: 'center',
  },
  adCardCompact: {
    borderRadius: 16,
    padding: 14,
  },
  adLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a5b4fc',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  adTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  adCopy: { fontSize: 13, color: '#cbd5f5' },
});
