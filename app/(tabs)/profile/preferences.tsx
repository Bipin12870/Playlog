import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme, type ThemeColors, type ThemePreference } from '../../../lib/theme';

const THEME_OPTIONS = [
  {
    key: 'system',
    label: 'Follow system theme',
    description: 'Let Playlog match the appearance you choose on your device.',
  },
  {
    key: 'dark',
    label: 'Dark mode',
    description: 'Always use the dark interface across the app.',
  },
  {
    key: 'light',
    label: 'Light mode',
    description: 'Always use the light interface across the app.',
  },
] as const;

type ThemeOption = ThemePreference;

export default function PreferencesScreen() {
  const { preference, resolved, setPreference, colors, statusBarStyle, isDark } = useTheme();
  const selectedTheme = preference;
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const checkIconColor = colors.success;
  const chevronColor = colors.muted;
  const helperText = useMemo(() => {
    if (selectedTheme === 'system') {
      return `Following your device preference (${resolved}).`;
    }
    return `Using the ${selectedTheme} interface.`;
  }, [resolved, selectedTheme]);

  const handleSelect = useCallback((value: ThemeOption) => {
    void setPreference(value);
  }, [setPreference]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={statusBarStyle} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="contrast" size={32} color="#fbbf24" />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Preferences</Text>
            <Text style={styles.subtitle}>Control how Playlog looks on your device.</Text>
          </View>
        </View>
        <Text style={styles.helperText}>{helperText}</Text>
        <View style={styles.optionList}>
          {THEME_OPTIONS.map((option) => {
            const active = selectedTheme === option.key;
            return (
              <Pressable
                key={option.key}
                style={({ pressed }) => [
                  styles.optionCard,
                  active && styles.optionCardActive,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => handleSelect(option.key)}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={checkIconColor} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Note</Text>
          <Text style={styles.noteCopy}>
            Your preference is saved on this device and applied across the app instantly.
          </Text>
          {Platform.OS === 'web' ? (
            <Text style={styles.noteCopy}>
              On web, change between light and dark from your browser or OS settings.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const successTint = `${colors.success}${isDark ? '26' : '1A'}`;
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
    helperText: {
      color: colors.subtle,
      fontSize: 14,
    },
    optionList: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionCardActive: {
      borderColor: colors.success,
      backgroundColor: successTint,
    },
    optionCardPressed: {
      opacity: 0.9,
    },
    optionText: {
      flex: 1,
      gap: 4,
    },
    optionLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    optionLabelActive: {
      color: colors.success,
    },
    optionDescription: {
      color: colors.muted,
      fontSize: 13,
    },
    noteCard: {
      marginTop: 8,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    noteLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    noteCopy: {
      color: colors.subtle,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
