import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { FollowEdge } from '../../types/follow';
import { approveFollowRequest, rejectFollowRequest } from '../../lib/follows';

type FollowRequestListProps = {
  requests: FollowEdge[];
  loading?: boolean;
  onError?: (error: Error) => void;
};

export function FollowRequestList({ requests, loading = false, onError }: FollowRequestListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

  const handleAction = async (uid: string, action: 'approve' | 'reject') => {
    setProcessingId(uid);
    setProcessingAction(action);
    try {
      if (action === 'approve') {
        await approveFollowRequest(uid);
      } else {
        await rejectFollowRequest(uid);
      }
    } catch (err) {
      if (onError) {
        onError(err instanceof Error ? err : new Error('REQUEST_ACTION_FAILED'));
      }
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={[
        styles.listContainer,
        requests.length === 0 && styles.listEmptyState,
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
            <Ionicons name="mail-open-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyLabel}>No pending follow requests.</Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const isProcessing = processingId === item.uid;
        return (
          <View style={styles.row}>
            <View style={styles.metaRow}>
              <View style={styles.avatarWrapper}>
                {item.photoURL ? (
                  <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={20} color="#1f2937" />
                  </View>
                )}
              </View>
              <View style={styles.meta}>
                <Text style={styles.displayName}>{item.displayName}</Text>
                {item.username ? <Text style={styles.username}>@{item.username}</Text> : null}
                {item.requestedAt ? (
                  <Text style={styles.timestamp}>
                    Requested {new Date(item.requestedAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.approveButton,
                  pressed && styles.actionPressed,
                  isProcessing && processingAction === 'approve' && styles.actionDisabled,
                ]}
                disabled={isProcessing}
                onPress={() => handleAction(item.uid, 'approve')}
              >
                {isProcessing && processingAction === 'approve' ? (
                  <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                  <>
                    <Ionicons name='checkmark' size={16} color="#f8fafc" />
                    <Text style={styles.actionLabel}>Approve</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rejectButton,
                  pressed && styles.actionPressed,
                  isProcessing && processingAction === 'reject' && styles.actionDisabled,
                ]}
                disabled={isProcessing}
                onPress={() => handleAction(item.uid, 'reject')}
              >
                {isProcessing && processingAction === 'reject' ? (
                  <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                  <>
                    <Ionicons name='close' size={16} color="#f8fafc" />
                    <Text style={styles.actionLabel}>Decline</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );
      }}
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
    color: '#94a3b8',
  },
  row: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
  username: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  timestamp: {
    color: '#94a3b8',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  separator: {
    height: 12,
  },
});

export default FollowRequestList;
