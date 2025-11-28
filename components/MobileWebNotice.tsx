import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StatusBar, StyleSheet, Text, View, Image, useWindowDimensions } from 'react-native';

import { useTheme } from '../lib/theme';

const LOGO = require('../assets/logo.png');

export function MobileWebNotice() {
  const { colors, statusBarStyle, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 520);

  const handleOpenDesktop = () => {
    void Linking.openURL('https://www.playlog.live');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#0f172a' : '#0b1a34',
            width: cardWidth,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brand, { color: colors.text }]}>Playlog</Text>
        </View>
        <Text style={[styles.headline, { color: colors.text }]}>Mobile web coming soon</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Playlog is being tested on web right now. We’re finishing the mobile web version, so please head to
          www.playlog.live on desktop for the best experience.
        </Text>
        <Pressable
          onPress={handleOpenDesktop}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.accent, opacity: pressed ? 0.92 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open playlog.live on desktop"
        >
          <Ionicons name="open-outline" size={18} color="#0f172a" />
          <Text style={styles.ctaLabel}>Open playlog.live</Text>
        </Pressable>
        <Text style={[styles.footer, { color: colors.subtle }]}>
          App Store and Play Store links will be added here once they’re ready.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: { width: 38, height: 38 },
  brand: { fontSize: 18, fontWeight: '700' },
  headline: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22 },
  cta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaLabel: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  footer: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
