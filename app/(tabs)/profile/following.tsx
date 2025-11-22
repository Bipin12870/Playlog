import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowing } from '../../../lib/hooks/useFollowList';
import { useUserProfile } from '../../../lib/userProfile';
import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function FollowingScreen() {
  const router = useRouter();
  const { user, initializing } = useAuthUser();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  const uid = user?.uid ?? null;
  const { profile, loading: profileLoading } = useUserProfile(uid);
  const following = useFollowing(uid);

  const title = useMemo(() => {
    const count = profile?.stats?.following ?? 0;
    if (!count) return 'Not following anyone yet';
    return `Following ${count} player${count === 1 ? '' : 's'}`;
  }, [profile?.stats?.following]);

  if (initializing || profileLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Sign in to manage who you follow.</Text>
        <Text style={styles.emptyCopy}>Log in to see and update the people you follow.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>{title}</Text>
      {following.error ? <Text style={styles.errorText}>{following.error.message}</Text> : null}
      <FollowList
        edges={following.edges}
        loading={following.loading}
        currentUid={uid}
        emptyLabel="You are not following anyone yet."
        theme={isDark ? 'dark' : 'light'}
        showBlockAction
        onSelectUser={(selected) => router.push(`/profile/${selected.uid}`)}
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
      gap: 12,
    },
    heading: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
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
      marginBottom: 8,
    },
  });
}
