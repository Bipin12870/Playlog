import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BlockedList } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useBlockedUsers } from '../../../lib/hooks/useBlockedList';
import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function BlockedUsersScreen() {
  const { user, initializing } = useAuthUser();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const uid = user?.uid ?? null;
  const blocked = useBlockedUsers(uid);

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
      marginBottom: 8,
    },
  });
}
