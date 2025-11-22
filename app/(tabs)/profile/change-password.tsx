import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth } from '../../../lib/firebase';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';

export default function ChangePasswordScreen() {
  const { user, initializing } = useAuthUser();
  const email = user?.email ?? null;
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const handleReset = async () => {
    if (!email) {
      setFeedback({ type: 'error', message: 'Add an email address to your profile first.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setFeedback({
        type: 'success',
        message: 'Password reset email sent. Check your inbox to continue.',
      });
    } catch (error) {
      console.error('Password reset failed', error);
      let message = 'Unable to send password reset email.';
      if (error instanceof Error) {
        message = error.message;
      }
      setFeedback({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Preparing change-password screen…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="key" size={32} color="#f97316" />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Change password</Text>
            <Text style={styles.subtitle}>
              A secure reset link will be sent to {email ?? 'your registered email address'}.
            </Text>
          </View>
        </View>
        {feedback ? (
          <Text style={feedback.type === 'success' ? styles.successText : styles.errorText}>
            {feedback.message}
          </Text>
        ) : null}
        <Pressable
          onPress={handleReset}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.buttonLabel}>Send password reset email</Text>
          )}
        </Pressable>
        <Text style={styles.helperText}>
          You will receive a secure link from Firebase that lets you set a new password. Be sure
          to check your spam folder if you don’t see it right away.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  page: {
    padding: 24,
    gap: 16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: '#4f46e5',
  },
  buttonLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  successText: {
    color: '#34d399',
    fontWeight: '600',
  },
  errorText: {
    color: '#fca5a5',
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
});
