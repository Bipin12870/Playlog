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

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
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
          <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  copy: {
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
  },
  warningBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    gap: 4,
  },
  warningText: { color: '#fca5a5', fontSize: 13 },
  deleteButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  deleteButtonPressed: { backgroundColor: '#dc2626' },
  deleteLabel: { color: '#fff', fontWeight: '700' },
  cancelLink: { paddingVertical: 10 },
  cancelText: { color: '#cbd5f5', fontWeight: '600' },
  errorText: { color: '#f87171', fontSize: 13 },
});
