import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type ThemeColors } from '../../../lib/theme';

export default function VisibilitySettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Visibility settings</Text>
      <Text style={styles.copy}>
        Choose whether your profile is public or private, and decide who can follow you or message you.
      </Text>
      <Text style={styles.copyMuted}>
        Profile visibility can be toggled inside Edit Profile today. Dedicated controls for followers and messages are
        coming soon.
      </Text>
      <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/profile/edit')}>
        <Text style={styles.ctaLabel}>Open Edit Profile</Text>
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
    copyMuted: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 20,
    },
    cta: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.accent,
      marginTop: 4,
    },
    ctaLabel: {
      color: isDark ? colors.text : '#ffffff',
      fontWeight: '700',
    },
  });
}
