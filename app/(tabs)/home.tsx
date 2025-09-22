import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>Logo</Text>
        </View>
        <TextInput
          placeholder="Search games"
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
        />
        <View style={styles.navLinks}>
          <Link href="/signup" style={styles.navLink}>
            Sign Up
          </Link>
          <Link href="/login" style={styles.navLink}>
            Login
          </Link>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.title}>Playlog</Text>
        <Text style={styles.subtitle}>Welcome! Track and discover games.</Text>
      </View>
      <View style={styles.body}>
        <Text>Get started by exploring your library.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  logoText: { fontSize: 12, color: '#6b7280' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLink: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  hero: { gap: 4 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#4b5563' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', marginTop: 32 },
});
