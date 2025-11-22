import { useRouter } from 'expo-router';
import { deleteUser } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user) {
      setError('Sign in to delete your account.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteUser(user);
      router.replace('/login');
    } catch (err: any) {
      setError('Could not delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    const execute = () => {
      void handleDelete();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          'Delete your account? This removes your profile, followers, and reviews.',
        );
        if (confirmed) execute();
      } else {
        execute();
      }
      return;
    }

    Alert.alert(
      'Delete account',
      'This will permanently remove your profile, followers, and reviews. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: execute },
      ],
    );
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Delete account</Text>
      <Text style={styles.copy}>
        Deleting your account removes your profile, followers, favourites, and reviews. This action is permanent.
      </Text>
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>You may need to re-login before deleting for security.</Text>
        <Text style={styles.warningText}>This action cannot be undone.</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        onPress={confirmDelete}
        disabled={deleting}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.deleteButtonPressed,
          deleting && { opacity: 0.7 },
        ]}
      >
        {deleting ? (
          <ActivityIndicator color={isDark ? colors.text : '#ffffff'} />
        ) : (
          <Text style={styles.deleteLabel}>Delete account permanently</Text>
        )}
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.cancelLink}>
        <Text style={styles.cancelText}>Cancel and go back</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    copy: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    warningBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    warningText: { color: colors.danger, fontSize: 13 },
    deleteButton: {
      marginTop: 4,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.danger,
    },
    deleteButtonPressed: { backgroundColor: '#dc2626' },
    deleteLabel: { color: isDark ? colors.text : '#ffffff', fontWeight: '700' },
    cancelLink: { paddingVertical: 10 },
    cancelText: { color: colors.muted, fontWeight: '600' },
    errorText: { color: colors.danger, fontSize: 13 },
  });
}
