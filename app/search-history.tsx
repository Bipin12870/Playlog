import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  SafeAreaView,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSearchHistory, type SearchHistoryItem } from '../lib/hooks/useSearchHistory';

const DAY_MS = 1000 * 60 * 60 * 24;

type HistorySection = SectionListData<SearchHistoryItem> & { title: string };

export default function SearchHistoryScreen() {
  const router = useRouter();
  const { history, clearHistory, removeEntry } = useSearchHistory();

  const sections = useMemo(() => buildSections(history), [history]);
  const hasHistory = history.length > 0;
  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/home');
  }, [router]);

  const handleSelectItem = useCallback(
    (item: SearchHistoryItem) => {
      const token = Date.now().toString();
      router.replace({
        pathname: '/(tabs)/home',
        params: { historyTerm: item.term, historyToken: token },
      });
    },
    [router],
  );

  const handleRemove = useCallback(
    (event: GestureResponderEvent, id: string) => {
      event.stopPropagation();
      removeEntry(id);
    },
    [removeEntry],
  );

  const renderItem: SectionListRenderItem<SearchHistoryItem, HistorySection> = ({ item }) => (
    <Pressable
      onPress={() => handleSelectItem(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowContent}>
        <Text style={styles.term}>{item.term}</Text>
        <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
      </View>
      <Pressable
        onPress={(event) => handleRemove(event, item.id)}
        hitSlop={12}
        style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
      >
        <Ionicons name="close-circle" size={18} color="#94a3b8" />
      </Pressable>
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
    <Text style={styles.sectionTitle}>{section.title}</Text>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search history',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.backRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={18} color="#60a5fa" />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Search history</Text>
        </View>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={clearHistory}
            disabled={!hasHistory}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && hasHistory && styles.clearButtonPressed,
              !hasHistory && styles.clearButtonDisabled,
            ]}
          >
            <Text style={[styles.clearText, !hasHistory && styles.clearTextDisabled]}>Clear history</Text>
          </Pressable>
        </View>
        {hasHistory ? (
          <View style={styles.historySection}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No recent searches</Text>
            <Text style={styles.emptyCopy}>Your searches will appear here for quick access.</Text>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

function buildSections(items: SearchHistoryItem[]) {
  const buckets: Record<'Today' | 'Yesterday' | 'Last 7 days' | 'Older', SearchHistoryItem[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };
  const todayStart = startOfDay(new Date());

  items.forEach((item) => {
    const created = new Date(item.createdAt);
    if (Number.isNaN(created.valueOf())) {
      buckets.Older.push(item);
      return;
    }
    const daysApart = Math.floor((todayStart.getTime() - startOfDay(created).getTime()) / DAY_MS);
    if (daysApart === 0) {
      buckets.Today.push(item);
    } else if (daysApart === 1) {
      buckets.Yesterday.push(item);
    } else if (daysApart >= 2 && daysApart <= 7) {
      buckets['Last 7 days'].push(item);
    } else {
      buckets.Older.push(item);
    }
  });

  return (['Today', 'Yesterday', 'Last 7 days', 'Older'] as const)
    .map((title) => ({ title, data: buckets[title] }))
    .filter((section) => section.data.length > 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.valueOf())) {
    return '';
  }
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${paddedMinutes} ${suffix}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 12,
  },
  backRow: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backLabel: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
  titleRow: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  controlsRow: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 48,
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  clearButtonPressed: {
    opacity: 0.6,
  },
  clearButtonDisabled: {
    opacity: 1,
  },
  clearText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
  clearTextDisabled: {
    color: '#475569',
  },
  sectionTitle: {
    color: '#cbd5f5',
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 12,
    letterSpacing: 0.6,
  },
  row: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.7)',
    minHeight: 68,
  },
  rowPressed: {
    backgroundColor: 'rgba(30,41,59,0.95)',
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  term: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: 999,
  },
  removeButtonPressed: {
    backgroundColor: '#1f2937',
  },
  separator: {
    height: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
});
