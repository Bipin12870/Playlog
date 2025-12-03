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
            <Text style={styles.logoText}>Playlog</Text>
          </View>
          <TextInput
            {...searchInputProps}
            style={styles.searchInput}
            placeholderTextColor="#8da2c0"
          />
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>New look</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>Curated discovery · Realtime sync · CMS ready</Text>
          <Link href="/about" style={styles.heroCta}>
            Learn more →
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16, padding: 16, backgroundColor: '#0c1426', borderRadius: 24 },
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  logoText: { fontSize: 12, color: '#7dd3fc', fontWeight: '700' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLink: { fontSize: 16, fontWeight: '700', color: '#e7edf8', textDecorationLine: 'none' },
  navLinkSpacing: { marginLeft: 4 },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.32)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#e7edf8',
    fontWeight: '600',
  },
  hero: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: '#0d1932', borderWidth: 1, borderColor: 'rgba(14,165,233,0.2)' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.4)',
  },
  badgeText: { color: '#7dd3fc', fontWeight: '700', letterSpacing: 0.8, fontSize: 12, textTransform: 'uppercase' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#e7edf8' },
  heroSubtitle: { fontSize: 15, color: '#b6c7e3' },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  heroMetaText: { color: '#9eb1d4', fontSize: 13, fontWeight: '600' },
  heroCta: { color: '#7dd3fc', fontSize: 14, fontWeight: '700', textDecorationLine: 'none' },
});
