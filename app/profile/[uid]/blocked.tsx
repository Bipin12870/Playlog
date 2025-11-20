import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BlockedList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useBlockedUsers } from '../../../lib/hooks/useBlockedList';
import { useUserProfile } from '../../../lib/userProfile';

export default function PublicBlockedScreen() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const router = useRouter();
  const { user, initializing } = useAuthUser();
  const viewerUid = user?.uid ?? null;

  const { profile, loading: profileLoading, error } = useUserProfile(targetUid);
  const isSelf = viewerUid && targetUid && viewerUid === targetUid;
  const blocked = useBlockedUsers(isSelf ? viewerUid : null);

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

  if (!isSelf) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="lock-closed" size={36} color="#f9fafb" />
        <Text style={styles.emptyTitle}>Blocked list is private</Text>
        <Text style={styles.emptyCopy}>Only this player can view their blocked users.</Text>
      </View>
    );
  }

  if (!viewerUid) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to manage blocked users.</Text>
        <Text style={styles.emptyCopy}>Log in to block or unblock players.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {blocked.error ? <Text style={styles.errorText}>{blocked.error.message}</Text> : null}
      <BlockedList
        edges={blocked.edges}
        loading={blocked.loading}
        currentUid={viewerUid}
        emptyLabel="No blocked users yet."
        onAuthRequired={() => router.push('/login')}
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
