import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FollowEdge } from '../../types/follow';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import FollowButton from './FollowButton';
import BlockButton from './BlockButton';

type FollowListProps = {
  edges: FollowEdge[];
  loading?: boolean;
  currentUid?: string | null;
  emptyLabel?: string;
  onAuthRequired?: () => void;
  onSelectUser?: (user: FollowEdge) => void;
  scrollEnabled?: boolean;
  theme?: 'light' | 'dark';
  showBlockAction?: boolean;
};

export function FollowList({
  edges,
  loading = false,
  currentUid,
  emptyLabel = 'No users to show yet.',
  onAuthRequired,
  onSelectUser,
  scrollEnabled = true,
  theme = 'light',
  showBlockAction = false,
}: FollowListProps) {
  const { user } = useAuthUser();
  const resolvedUid = currentUid ?? user?.uid ?? null;
  const isDark = theme === 'dark';
  const followButtonVariant = isDark ? 'primary' : 'secondary';

  return (
    <FlatList
      data={edges}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={[
        styles.listContainer,
        edges.length === 0 && styles.listEmptyState,
        isDark && styles.listContainerDark,
      ]}
      scrollEnabled={scrollEnabled}
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
            <Ionicons name="people-outline" size={32} color={isDark ? '#94a3b8' : '#94a3b8'} />
            <Text style={[styles.emptyLabel, isDark && styles.emptyLabelDark]}>{emptyLabel}</Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const isSelf = resolvedUid === item.uid;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.row,
              isDark && styles.rowDark,
              pressed && (isDark ? styles.rowPressedDark : styles.rowPressed),
            ]}
            onPress={() => (onSelectUser ? onSelectUser(item) : null)}
            disabled={!onSelectUser}
          >
            <View style={styles.avatarWrapper}>
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, isDark && styles.avatarFallbackDark]}>
                  <Ionicons name="person" size={20} color={isDark ? '#f9fafb' : '#1f2937'} />
                </View>
              )}
            </View>
            <View style={styles.meta}>
              <Text style={[styles.displayName, isDark && styles.displayNameDark]}>
                {item.displayName}
              </Text>
              {item.username ? (
                <Text style={[styles.username, isDark && styles.usernameDark]}>
                  @{item.username}
                </Text>
              ) : null}
              {item.bio ? (
                <Text style={[styles.bio, isDark && styles.bioDark]} numberOfLines={1}>
                  {item.bio}
                </Text>
              ) : null}
            </View>
            <View style={styles.action}>
              {!isSelf ? (
                <View style={styles.actionStack}>
                  <FollowButton
                    targetUid={item.uid}
                    currentUid={resolvedUid}
                    size="small"
                    variant={followButtonVariant}
                    onAuthRequired={onAuthRequired}
                  />
                  {showBlockAction ? (
                    <BlockButton
                      targetUid={item.uid}
                      currentUid={resolvedUid}
                      size="small"
                      onAuthRequired={onAuthRequired}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, isDark && styles.separatorDark]} />
      )}
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
  listContainerDark: {
    backgroundColor: '#111827',
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
    color: '#6b7280',
  },
  emptyLabelDark: {
    color: '#cbd5f5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#f3f4f6',
  },
  rowDark: {
    backgroundColor: '#0f172a',
  },
  rowPressedDark: {
    backgroundColor: '#1f2937',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackDark: {
    backgroundColor: '#1f2937',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  displayNameDark: {
    color: '#f9fafb',
  },
  username: {
    fontSize: 13,
    color: '#6b7280',
  },
  usernameDark: {
    color: '#94a3b8',
  },
  bio: {
    fontSize: 12,
    color: '#4b5563',
  },
  bioDark: {
    color: '#cbd5f5',
  },
  action: {
    marginLeft: 12,
  },
  actionStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 72,
  },
  separatorDark: {
    backgroundColor: '#1f2937',
  },
});

export default FollowList;
