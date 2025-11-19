import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FollowEdge } from '../../types/follow';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { resolveAvatarSource } from '../../lib/avatar';
import BlockButton from './BlockButton';

type BlockedListProps = {
  edges: FollowEdge[];
  loading?: boolean;
  emptyLabel?: string;
  currentUid?: string | null;
  onAuthRequired?: () => void;
  onSelectUser?: (user: FollowEdge) => void;
};

export function BlockedList({
  edges,
  loading = false,
  emptyLabel = 'No blocked users.',
  currentUid,
  onAuthRequired,
  onSelectUser,
}: BlockedListProps) {
  const { user } = useAuthUser();
  const resolvedUid = currentUid ?? user?.uid ?? null;

  return (
    <FlatList
      data={edges}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={[
        styles.listContainer,
        edges.length === 0 && styles.listEmptyState,
      ]}
      ListHeaderComponent={
        loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.emptyState}>
            <Ionicons name="ban" size={32} color="#94a3b8" />
            <Text style={styles.emptyLabel}>{emptyLabel}</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => (onSelectUser ? onSelectUser(item) : null)}
          disabled={!onSelectUser}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={resolveAvatarSource(item.photoURL, item.avatarKey)}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.meta}>
            <Text style={styles.displayName}>{item.displayName}</Text>
            {item.username ? <Text style={styles.username}>@{item.username}</Text> : null}
            {item.bio ? (
              <Text style={styles.bio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
          <BlockButton
            targetUid={item.uid}
            currentUid={resolvedUid}
            size="small"
            mode="unblock"
            onAuthRequired={onAuthRequired}
          />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 12,
  },
  listEmptyState: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingState: {
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  emptyLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#1f2937',
    borderRadius: 16,
  },
  rowPressed: {
    backgroundColor: '#111827',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
  },
  username: {
    fontSize: 13,
    color: '#cbd5f5',
  },
  bio: {
    fontSize: 12,
    color: '#94a3b8',
  },
  separator: {
    height: 12,
  },
});

export default BlockedList;
