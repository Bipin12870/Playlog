import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function VisibilitySettingsScreen() {
  const router = useRouter();

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
    color: '#cbd5f5',
    lineHeight: 20,
  },
  copyMuted: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 20,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    marginTop: 4,
  },
  ctaLabel: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
