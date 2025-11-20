import { StyleSheet, Text, View } from 'react-native';

export default function MuteListScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Mute lists</Text>
      <Text style={styles.copy}>
        Muted users stay out of your feed and notifications without blocking them completely.
      </Text>
      <Text style={styles.copyMuted}>
        We’re adding mute controls soon. Until then, you can manage blocking from the Blocked users screen.
      </Text>
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
});
