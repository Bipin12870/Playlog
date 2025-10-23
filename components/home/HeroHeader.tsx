import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type HeroHeaderProps = {
  showMobileHeader: boolean;
  searchInputProps: TextInputProps;
  title: string;
  subtitle: string;
};

export function HeroHeader({
  showMobileHeader,
  searchInputProps,
  title,
  subtitle,
}: HeroHeaderProps) {
  return (
    <View style={styles.wrapper}>
      {showMobileHeader && (
        <View style={styles.mobileHeader}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Logo</Text>
          </View>
          <TextInput {...searchInputProps} style={styles.searchInput} />
          <View style={styles.navLinks}>
            <Link href="/signup" style={styles.navLink}>
              Sign Up
            </Link>
            <Link href="/login" style={[styles.navLink, styles.navLinkSpacing]}>
              Login
            </Link>
          </View>
        </View>
      )}

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
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
  navLink: { fontSize: 16, fontWeight: '600', color: '#1f2937', textDecorationLine: 'none' },
  navLinkSpacing: { marginLeft: 4 },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  hero: { gap: 8 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  heroSubtitle: { fontSize: 14, color: '#4b5563' },
});
