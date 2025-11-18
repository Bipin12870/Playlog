import { useMemo } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { GameCard } from '../GameCard';
import { GameSummary } from '../../types/game';

type EmptyState = {
  title: string;
  copy: string;
};

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
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
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
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: SearchResultsProps) {
  const isCompact = cardVariant === 'compact';
  const isWeb = Platform.OS === 'web';
  const baseColumns = isWeb ? Math.max(columnCount, 6) : columnCount;
  const resolvedColumnCount = isCompact && baseColumns < 3 ? 3 : baseColumns;

  const data = useMemo<(GameSummary | null)[]>(() => {
    if (!games.length) return [];
    const remainder = games.length % resolvedColumnCount;
    if (remainder === 0) return games;
    const placeholders = Array.from({ length: resolvedColumnCount - remainder }, () => null);
    return [...games, ...placeholders];
  }, [games, resolvedColumnCount]);

  const renderItem: ListRenderItem<GameSummary | null> = ({ item }) => {
    if (!item) {
      return (
        <View
          pointerEvents="none"
          style={[styles.card, isCompact && styles.compactCard, styles.placeholderCard, cardStyle]}
        />
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

  const loadMoreFooter =
    hasMore && !loading ? (
      <View style={styles.loadMoreRow}>
        {loadingMore ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : (
          <Pressable
            style={styles.loadMoreButton}
            onPress={onLoadMore}
            disabled={!onLoadMore || loadingMore}
          >
            <Text style={styles.loadMoreText}>Load more results</Text>
          </Pressable>
        )}
      </View>
    ) : null;

  const resolvedFooterComponent =
    footerComponent || loadMoreFooter ? (
      <>
        {footerComponent}
        {loadMoreFooter}
      </>
    ) : null;

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
        keyExtractor={(item, index) => (item ? item.id.toString() : `placeholder-${index}`)}
        columnWrapperStyle={
          resolvedColumnCount > 1
            ? [styles.gridRow, isCompact && styles.compactGridRow, gridRowStyle]
            : undefined
        }
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={resolvedFooterComponent}
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
  loadMoreRow: { paddingVertical: 24, alignItems: 'center' },
  loadMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  loadMoreText: { color: '#e0e7ff', fontWeight: '700' },
});
