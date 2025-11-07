import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowRequestList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowRequests } from '../../../lib/hooks/useFollowRequests';

export default function FollowRequestsScreen() {
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const requests = useFollowRequests(uid);

  const handleError = (error: Error) => {
    setFeedback({ type: 'error', message: error.message });
  };

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
        <Text style={styles.emptyTitle}>Sign in to manage follow requests.</Text>
        <Text style={styles.emptyCopy}>
          Once you’re logged in you can approve or decline new followers.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {feedback ? (
        <Text style={feedback.type === 'error' ? styles.errorText : styles.successText}>
          {feedback.message}
        </Text>
      ) : null}
      {requests.error ? <Text style={styles.errorText}>{requests.error.message}</Text> : null}
      <FollowRequestList
        requests={requests.requests}
        loading={requests.loading}
        onError={handleError}
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
    marginBottom: 12,
  },
  successText: {
    color: '#34d399',
    fontSize: 14,
    marginBottom: 12,
  },
});
