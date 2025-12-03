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
    borderColor: 'rgba(14,165,233,0.28)',
    backgroundColor: '#0d162b',
    padding: 16,
    gap: 10,
    justifyContent: 'center',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    shadowColor: '#020617',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  textBlock: { flex: 1, gap: 6 },
  tag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7dd3fc',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#e7edf8' },
  copy: { fontSize: 14, color: '#b6c7e3' },
  cta: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    shadowColor: '#0b1a2f',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaLabel: { color: '#f8fafc', fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.9 },
});
