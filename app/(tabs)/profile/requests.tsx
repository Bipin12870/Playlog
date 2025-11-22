import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowRequestList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowRequests } from '../../../lib/hooks/useFollowRequests';
import { isModerationError } from '../../../lib/errors';
import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function FollowRequestsScreen() {
  const { user, initializing } = useAuthUser();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const uid = user?.uid ?? null;
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const requests = useFollowRequests(uid);
  const moderationBlocked = isModerationError(requests.error);

  const handleError = (error: Error) => {
    setFeedback({ type: 'error', message: error.message });
  };

  if (initializing) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accent} />
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

  if (moderationBlocked) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Follow requests unavailable</Text>
        <Text style={styles.emptyCopy}>
          A recent request is under review. Please check back shortly while we verify the content.
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyCopy: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      marginBottom: 12,
    },
    successText: {
      color: colors.success,
      fontSize: 14,
      marginBottom: 12,
    },
  });
}
