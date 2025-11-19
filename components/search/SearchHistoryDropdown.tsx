import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { SearchHistoryItem } from '../../lib/hooks/useSearchHistory';

export type SearchHistoryDropdownProps = {
  items: SearchHistoryItem[];
  onSelect: (term: string) => void;
  onSeeAll?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SearchHistoryDropdown({ items, onSelect, onSeeAll, style }: SearchHistoryDropdownProps) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      <View style={styles.pointer} />
      <View style={styles.container}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.term)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.term}>{item.term}</Text>
          </Pressable>
        ))}
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            style={({ pressed }) => [styles.row, styles.viewAllRow, pressed && styles.rowPressed]}
          >
            <Text style={styles.viewAllText}>View all history</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    paddingTop: 6,
  },
  pointer: {
    position: 'absolute',
    top: 0,
    left: 32,
    width: 12,
    height: 12,
    backgroundColor: '#111827',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
    zIndex: 1,
  },
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  row: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  rowPressed: {
    backgroundColor: '#1f2937',
  },
  term: {
    color: '#f8fafc',
    fontSize: 15,
  },
  viewAllRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
    marginTop: 4,
  },
  viewAllText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SearchHistoryDropdown;
