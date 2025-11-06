import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BlockedList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useBlockedUsers } from '../../../lib/hooks/useBlockedList';

export default function BlockedUsersScreen() {
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const blocked = useBlockedUsers(uid);

  if (initializing) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.emptyState}>
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
        currentUid={uid}
        emptyLabel="No blocked users yet."
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
