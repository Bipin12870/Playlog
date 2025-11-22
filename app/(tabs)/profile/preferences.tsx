import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

const THEME_OPTIONS = [
  {
    key: 'system',
    label: 'Follow system theme',
    description: 'Let Playlog match the appearance you choose on your device.',
  },
  {
    key: 'dark',
    label: 'Dark mode',
    description: 'Always use the dark interface across the app.',
  },
  {
    key: 'light',
    label: 'Light mode',
    description: 'Always use the light interface across the app.',
  },
] as const;

type ThemeOption = (typeof THEME_OPTIONS)[number]['key'];

export default function PreferencesScreen() {
  const scheme = useColorScheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('system');
  const helperText = useMemo(() => {
    if (selectedTheme === 'system') {
      return `Currently following your system preference (${scheme ?? 'dark'}).`;
    }
    return `Using the ${selectedTheme} interface.`;
  }, [scheme, selectedTheme]);

  const handleSelect = useCallback((value: ThemeOption) => {
    setSelectedTheme(value);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="contrast" size={32} color="#fbbf24" />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Preferences</Text>
            <Text style={styles.subtitle}>Control how Playlog looks on your device.</Text>
          </View>
        </View>
        <Text style={styles.helperText}>{helperText}</Text>
        <View style={styles.optionList}>
          {THEME_OPTIONS.map((option) => {
            const active = selectedTheme === option.key;
            return (
              <Pressable
                key={option.key}
                style={({ pressed }) => [
                  styles.optionCard,
                  active && styles.optionCardActive,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => handleSelect(option.key)}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={20} color="#34d399" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Note</Text>
          <Text style={styles.noteCopy}>
            Theme selections are stored locally for now. The whole app will respect your preference
            once the system-wide theme support is enabled.
          </Text>
          {Platform.OS === 'web' ? (
            <Text style={styles.noteCopy}>
              On web, change between light and dark from your browser or OS settings.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  page: {
    padding: 24,
    gap: 16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  helperText: {
    color: '#cbd5f5',
    fontSize: 14,
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  optionCardActive: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  optionCardPressed: {
    opacity: 0.9,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: '#22c55e',
  },
  optionDescription: {
    color: '#94a3b8',
    fontSize: 13,
  },
  noteCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  noteLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  noteCopy: {
    color: '#cbd5f5',
    fontSize: 13,
    lineHeight: 18,
  },
});
