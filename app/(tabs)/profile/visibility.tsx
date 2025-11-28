import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { updateUserProfile, useUserProfile } from '../../../lib/userProfile';
import { useTheme, type ThemeColors } from '../../../lib/theme';

type VisibilityOption = {
  key: 'public' | 'private';
  title: string;
  description: string;
  subtitle: string;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    key: 'public',
    title: 'Public profile',
    description: 'Anyone on Playlog can see your favourites and reviews.',
    subtitle: 'Following is automatic for anyone who finds you.',
  },
  {
    key: 'private',
    title: 'Private profile',
    description: 'Only approved followers see your favourites and reviews.',
    subtitle: 'You control who joins your inner circle.',
  },
];

export default function VisibilitySettingsScreen() {
  const { width } = useWindowDimensions();
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const { profile, loading, error } = useUserProfile(uid);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile) {
      setProfileVisibility('public');
    } else {
      setProfileVisibility(profile.profileVisibility === 'private' ? 'private' : 'public');
    }
  }, [profile?.profileVisibility, profile]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const currentVisibility = profile.profileVisibility === 'private' ? 'private' : 'public';
    return profileVisibility !== currentVisibility;
  }, [profile, profileVisibility]);

  const handleSelect = useCallback((key: 'public' | 'private') => {
    setProfileVisibility(key);
    setFeedback(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!uid || !hasChanges) return;
    setSaving(true);
    setFeedback(null);

    try {
      await updateUserProfile({ profileVisibility });
      setFeedback({ type: 'success', message: 'Profile visibility updated.' });
    } catch (err) {
      let message = 'Unable to update visibility.';
      if (err instanceof Error) {
        message = err.message;
      }
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  }, [hasChanges, profileVisibility, uid]);

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading visibility preferences…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color={colors.muted} />
        <Text style={styles.emptyTitle}>Sign in to control your visibility</Text>
        <Text style={styles.emptyCopy}>Sign in to toggle between a public or private profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { minHeight: width * 1.8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Ionicons name="eye" size={32} color={colors.warning} />
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Profile visibility</Text>
          <Text style={styles.subtitle}>
            Choose who can follow you and see your connections, favourites, and reviews.
          </Text>
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

      <View style={styles.optionStack}>
        {VISIBILITY_OPTIONS.map((option) => {
          const selected = profileVisibility === option.key;
          return (
            <Pressable
              key={option.key}
              style={({ pressed }) => [
                styles.optionCard,
                selected && styles.optionCardActive,
                pressed && styles.optionCardPressed,
              ]}
              onPress={() => handleSelect(option.key)}
            >
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <View style={[styles.optionBadge, selected && styles.optionBadgeActive]}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={selected ? colors.background : colors.subtle}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {feedback ? (
        <Text style={feedback.type === 'success' ? styles.successText : styles.errorText}>
          {feedback.message}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={!hasChanges || saving}
        style={({ pressed }) => [
          styles.button,
          (saving || !hasChanges) && styles.buttonDisabled,
          pressed && !saving && hasChanges && styles.buttonPressed,
        ]}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={isDark ? colors.text : '#ffffff'} />
        ) : (
          <Text style={styles.buttonLabel}>Save visibility settings</Text>
        )}
      </Pressable>

      <Text style={styles.helperText}>
        Private profiles require you to approve followers before they can see sensitive sections like
        favourites and reviews.
      </Text>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    page: {
      flex: 1,
      padding: 24,
      gap: 22,
      backgroundColor: colors.background,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    heroCopy: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      color: colors.subtle,
      fontSize: 15,
      lineHeight: 22,
    },
    optionStack: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'space-between',
    },
    optionCardActive: {
      borderColor: colors.accent,
      backgroundColor: isDark ? `${colors.accent}26` : `${colors.accent}12`,
    },
    optionCardPressed: {
      opacity: 0.9,
    },
    optionText: {
      flex: 1,
      gap: 4,
    },
    optionLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.subtle,
    },
    optionSubtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    optionBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionBadgeActive: {
      borderColor: colors.success,
      backgroundColor: colors.success,
    },
    successText: {
      color: colors.success,
      fontWeight: '600',
    },
    errorText: {
      color: colors.danger,
      fontWeight: '600',
      marginTop: 8,
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 999,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonDisabled: {
      opacity: 0.6,
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
      marginTop: 10,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 12,
    },
    loadingText: {
      color: colors.subtle,
      fontSize: 16,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: colors.background,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    emptyCopy: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
