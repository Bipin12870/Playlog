import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameCard } from '../GameCard';
import { GameSummary } from '../../types/game';

export type DiscoverySection = {
  key: string;
  title: string;
  subtitle?: string;
  games: GameSummary[];
};

type DiscoverySectionsProps = {
  sections: DiscoverySection[];
  columnCount: number;
  loading: boolean;
  error?: string | null;
  onSelect: (game: GameSummary) => void;
  emptyTitle?: string;
  emptyCopy?: string;
};

export function DiscoverySections({
  sections,
  columnCount,
  loading,
  error,
  onSelect,
  emptyTitle = 'Nothing to explore yet',
  emptyCopy = 'We couldn’t load games for you. Try searching or refresh the page.',
}: DiscoverySectionsProps) {
  const hasContent = sections.some((section) => section.games.length > 0);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {hasContent ? (
        sections.map((section) =>
          section.games.length ? (
            <View style={styles.section} key={section.key}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>{section.title}</Text>
                {section.subtitle ? (
                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                ) : null}
              </View>
              <FlatList
                data={section.games}
                keyExtractor={(item) => item.id.toString()}
                numColumns={columnCount}
                scrollEnabled={false}
                contentContainerStyle={styles.sectionListContent}
                columnWrapperStyle={columnCount > 1 ? styles.gridRow : undefined}
                renderItem={({ item }) => (
                  <GameCard game={item} containerStyle={styles.card} onPress={() => onSelect(item)} />
                )}
              />
            </View>
          ) : null
        )
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyCopy}>{emptyCopy}</Text>
        </View>
      )}
      {error ? <Text style={[styles.errorText, styles.exploreError]}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 48, gap: 32 },
  loadingRow: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 16 },
  sectionHeader: { gap: 4 },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 14, color: '#6b7280' },
  sectionListContent: { paddingBottom: 8 },
  gridRow: { gap: 20, paddingBottom: 20 },
  card: { flex: 1, marginBottom: 20, minWidth: 0 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyCopy: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },
  errorText: { marginTop: 12, color: '#ef4444', textAlign: 'center' },
  exploreError: { marginTop: -12 },
});