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
import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function ChangePasswordScreen() {
  const { user, initializing } = useAuthUser();
  const { colors, statusBarStyle, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
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
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Preparing change-password screen…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={statusBarStyle} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="key" size={32} color={colors.warning} />
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
            <ActivityIndicator color={isDark ? colors.text : '#ffffff'} />
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

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonDisabled: {
      backgroundColor: isDark ? '#4f46e5' : colors.accentSoft,
    },
    buttonLabel: {
      color: isDark ? colors.text : '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
    helperText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    successText: {
      color: colors.success,
      fontWeight: '600',
    },
    errorText: {
      color: colors.danger,
      fontWeight: '600',
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 12,
    },
    loadingText: {
      color: colors.text,
      fontSize: 16,
    },
  });
}
