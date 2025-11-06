import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowers } from '../../../lib/hooks/useFollowList';
import { useUserProfile } from '../../../lib/userProfile';

export default function FollowersScreen() {
  const router = useRouter();
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const { profile, loading: profileLoading } = useUserProfile(uid);
  const followers = useFollowers(uid);

  const title = useMemo(() => {
    const count = profile?.stats?.followers ?? 0;
    if (!count) return 'No followers yet';
    return `${count} follower${count === 1 ? '' : 's'}`;
  }, [profile?.stats?.followers]);

  if (initializing || profileLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Sign in to view your followers.</Text>
        <Text style={styles.emptyCopy}>Once you’re logged in you can see who follows you.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>{title}</Text>
      {followers.error ? <Text style={styles.errorText}>{followers.error.message}</Text> : null}
      <FollowList
        edges={followers.edges}
        loading={followers.loading}
        currentUid={uid}
        emptyLabel="No one follows you yet."
        theme="dark"
        showBlockAction
        onSelectUser={(selected) => router.push(`/profile/${selected.uid}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    gap: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
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
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    marginBottom: 8,
  },
});
