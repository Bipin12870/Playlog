import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type AdBannerProps = {
  tag?: string;
  title: string;
  copy: string;
  ctaLabel: string;
  href: string;
};

export function AdBanner({ tag = 'Sponsored', title, copy, ctaLabel, href }: AdBannerProps) {
  const handlePress = async () => {
    if (!href) return;
    try {
      await Linking.openURL(href);
    } catch (err) {
      console.warn('Unable to open ad link', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={styles.tag}>{tag}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
      </View>
      <Pressable onPress={handlePress} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaLabel}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b1220',
    padding: 16,
    gap: 10,
    justifyContent: 'center',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  textBlock: { flex: 1, gap: 6 },
  tag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
  copy: { fontSize: 14, color: '#cbd5f5' },
  cta: {
    backgroundColor: '#5b55f6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: Platform.OS === 'web' ? 'flex-end' : 'stretch',
  },
  ctaLabel: { color: '#f8fafc', fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.9 },
});
