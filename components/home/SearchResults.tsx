import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
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
}: SearchResultsProps) {
  const renderItem: ListRenderItem<GameSummary> = ({ item }) => (
    <GameCard game={item} containerStyle={[styles.card, cardStyle]} onPress={() => onSelect(item)} />
  );

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={games}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        numColumns={columnCount}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={columnCount > 1 ? [styles.gridRow, gridRowStyle] : undefined}
        renderItem={renderItem}
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
  listContent: { paddingBottom: 48 },
  gridRow: { gap: 20, paddingBottom: 20 },
  card: { flex: 1, marginBottom: 20, minWidth: 0 },
  loadingRow: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyCopy: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },
  errorText: { marginTop: 12, color: '#ef4444', textAlign: 'center' },
});
