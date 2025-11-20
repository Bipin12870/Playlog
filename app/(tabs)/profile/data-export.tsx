import { StyleSheet, Text, View } from 'react-native';

export default function DataExportScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Data export</Text>
      <Text style={styles.copy}>
        Request a copy of your Playlog data, including profile details, favourites, and reviews. We’ll generate an export
        in a portable format.
      </Text>
      <Text style={styles.copyMuted}>
        Self-serve exports are coming soon. For now, contact support if you need a data export and we’ll handle it for you.
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
