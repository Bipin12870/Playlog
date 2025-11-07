import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowing } from '../../../lib/hooks/useFollowList';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { canViewerAccessProfile } from '../../../lib/profileVisibility';
import { useUserProfile } from '../../../lib/userProfile';

export default function PublicFollowingScreen() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const router = useRouter();
  const { user, initializing } = useAuthUser();
  const viewerUid = user?.uid ?? null;

  const { profile, loading: profileLoading, error } = useUserProfile(targetUid);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
  });
  const following = useFollowing(canView ? targetUid : null);

  if (initializing || profileLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        {error ? <Text style={styles.emptyCopy}>{error.message}</Text> : null}
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="lock-closed" size={36} color="#f9fafb" />
        <Text style={styles.privateTitle}>Following list is hidden</Text>
        <Text style={styles.privateCopy}>
          {hasPendingRequest
            ? 'Follow request sent. You will be able to see who they follow once approved.'
            : 'This account is private. Follow and wait for approval to view who they follow.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {following.error ? <Text style={styles.errorText}>{following.error.message}</Text> : null}
      <FollowList
        edges={following.edges}
        loading={following.loading}
        currentUid={viewerUid}
        emptyLabel="Not following anyone yet."
        showBlockAction={viewerUid === targetUid}
        onAuthRequired={() => router.push('/login')}
        onSelectUser={(selected) => router.push(`/profile/${selected.uid}`)}
        theme="dark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  privateState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  privateCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    marginBottom: 8,
  },
});
