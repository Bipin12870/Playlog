import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../lib/theme';

const FOUNDERS = [
  { name: 'Bipin Sapkota', image: require('../assets/founders/bipin.png') },
  { name: 'Kiran Shrestha', image: require('../assets/founders/kiran.png') },
  { name: 'Saugat Uprety', image: require('../assets/founders/saugat.png') },
  { name: 'Premesh Wasti', image: require('../assets/founders/premesh.png') },
];

const ABOUT_PARAGRAPHS = [
  'Playlog was created by four friends — Bipin Sapkota, Kiran Shrestha, Saugat Uprety, and Premesh Wasti — who began as students building small projects together and slowly turned those late-night ideas into something bigger. Playlog exists because all four of us believe games deserve a better place to be shared, celebrated, and remembered.',
  "Every line of code, every design choice, and every feature came from countless hours of working after class, helping each other learn, arguing over UI colours, and pushing through moments where the whole thing felt impossible. What kept us going wasn't just the vision of what Playlog could become, but the joy of building it together.",
];

const HIGHLIGHTS = [
  { label: 'Founders', value: '4', emoji: '👥', gradient: ['#667eea', '#764ba2'] },
  { label: 'Journey', value: '2024', emoji: '🚀', gradient: ['#f093fb', '#f5576c'] },
  { label: 'Mission', value: 'Gaming', emoji: '🎮', gradient: ['#4facfe', '#00f2fe'] },
];

export default function AboutScreen() {
  const { colors, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isLarge = isWeb && width >= 900;

  const founderCards = FOUNDERS.map((founder) => (
    <View
      key={founder.name}
      style={[
        styles.founderCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.founderImageContainer}>
        <View
          style={[
            styles.founderImageGlow,
            {
              backgroundColor: colors.accent,
              opacity: 0.16,
            },
          ]}
        />
        <Image source={founder.image} style={styles.founderImage} resizeMode="cover" />
        <View
          style={[
            styles.founderImageRing,
            {
              borderColor: colors.accent,
            },
          ]}
        />
      </View>
      <Text style={[styles.founderName, { color: colors.text }]}>{founder.name}</Text>
      <View style={[styles.founderBadge, { backgroundColor: colors.accent + '15' }]}>
        <Text style={[styles.founderRole, { color: colors.accent }]}>Co-founder</Text>
      </View>
    </View>
  ));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isWeb ? 32 : 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, isLarge && styles.innerWide]}>
          {/* Hero Section */}
          <View style={styles.heroContainer}>
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: colors.surfaceSecondary ?? colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Gradient blobs */}
              <LinearGradient
                colors={[colors.accent, isDark ? '#020617' : '#e5e7eb']}
                style={styles.orbLarge}
              />
              <LinearGradient
                colors={[colors.accent, 'transparent']}
                style={styles.orbSmall}
              />

              <View style={styles.heroContent}>
                <View
                  style={[
                    styles.heroLabelContainer,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Text style={[styles.heroLabelDot, { color: colors.accent }]}>●</Text>
                  <Text style={[styles.heroLabel, { color: colors.accent }]}>OUR STORY</Text>
                </View>

                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color: colors.text,
                      fontSize: isLarge ? 40 : 30,
                      lineHeight: isLarge ? 48 : 38,
                    },
                  ]}
                >
                  Built with passion,{'\n'}
                  <Text style={{ color: colors.accent, fontStyle: 'italic' }}>
                    powered by friendship
                  </Text>
                </Text>

                <View
                  style={[
                    styles.heroDivider,
                    { backgroundColor: colors.border, opacity: 0.6 },
                  ]}
                />

                <Text
                  style={[
                    styles.heroSubtitle,
                    {
                      color: colors.muted,
                      fontSize: isLarge ? 16 : 14,
                      lineHeight: isLarge ? 24 : 22,
                    },
                  ]}
                >
                  From late-night prototypes to a platform celebrating gaming culture — this is the
                  journey of four friends who dared to dream bigger.
                </Text>
              </View>
            </View>
          </View>

          {/* Highlighted Stats */}
          <View style={styles.badgesContainer}>
            {HIGHLIGHTS.map((item) => (
              <View
                key={item.label}
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badgeGlow}
                />
                <View
                  style={[
                    styles.badgeIconContainer,
                    {
                      backgroundColor: colors.accent + '10',
                      borderColor: colors.accent + '30',
                    },
                  ]}
                >
                  <Text style={styles.badgeEmoji}>{item.emoji}</Text>
                </View>
                <Text style={[styles.badgeValue, { color: colors.text }]}>
                  {item.value}
                </Text>
                <Text style={[styles.badgeLabel, { color: colors.muted }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Story Section */}
          <View
            style={[
              styles.storyCard,
              {
                backgroundColor: colors.surfaceSecondary ?? colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.storyHeader}>
              <View
                style={[
                  styles.storyIconWrapper,
                  { backgroundColor: colors.accent + '10' },
                ]}
              >
                <View
                  style={[
                    styles.storyIcon,
                    { backgroundColor: colors.accent + '25' },
                  ]}
                >
                  <Text style={styles.storyIconText}>📖</Text>
                </View>
              </View>
              <View style={styles.storyHeaderText}>
                <Text style={[styles.storyTitle, { color: colors.text }]}>The Journey</Text>
                <Text style={[styles.storySubtitle, { color: colors.muted }]}>
                  How it all began
                </Text>
              </View>
            </View>

            <View style={styles.storyContent}>
              {ABOUT_PARAGRAPHS.map((paragraph, index) => (
                <View key={index} style={styles.paragraphContainer}>
                  <View style={styles.paragraphDecoration}>
                    <View
                      style={[
                        styles.paragraphDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                    <View
                      style={[
                        styles.paragraphLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.bodyText,
                      {
                        color: colors.muted,
                        fontSize: isLarge ? 15 : 14,
                        lineHeight: isLarge ? 24 : 22,
                      },
                    ]}
                  >
                    {paragraph}
                  </Text>
                </View>
              ))}

              <View
                style={[
                  styles.quoteContainer,
                  {
                    backgroundColor: colors.accent + '10',
                    borderLeftColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quoteText,
                    {
                      color: colors.text,
                      fontSize: isLarge ? 16 : 15,
                      lineHeight: isLarge ? 24 : 22,
                    },
                  ]}
                >
                  "What kept us going wasn't just the vision, but the joy of building it together."
                </Text>
              </View>
            </View>
          </View>

          {/* Founders Section */}
          <View
            style={[
              styles.foundersCard,
              {
                backgroundColor: colors.surfaceSecondary ?? colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.foundersHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Meet the Team
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Four friends who turned a dream into reality
              </Text>
              <View
                style={[
                  styles.sectionDivider,
                  { backgroundColor: colors.accent },
                ]}
              />
            </View>

            {isWeb ? (
              <View style={styles.founderGrid}>{founderCards}</View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.founderScroll}
                snapToInterval={190}
                decelerationRate="fast"
              >
                {founderCards}
              </ScrollView>
            )}
          </View>

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
  },
  inner: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  innerWide: {
    maxWidth: 1040,
  },
  heroContainer: {
    marginBottom: 32,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 22,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 240,
  },
  orbLarge: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.35,
  },
  orbSmall: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.25,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
    gap: 8,
  },
  heroLabelDot: {
    fontSize: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  heroDivider: {
    width: 56,
    height: 3,
    borderRadius: 999,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontWeight: '400',
    maxWidth: 620,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 32,
  },
  badge: {
    flex: 1,
    minWidth: 150,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  badgeGlow: {
    position: 'absolute',
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.35,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    zIndex: 1,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  storyCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  storyIconWrapper: {
    padding: 4,
    borderRadius: 16,
    marginRight: 16,
  },
  storyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyIconText: {
    fontSize: 24,
  },
  storyHeaderText: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  storySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.85,
  },
  storyContent: {
    gap: 22,
  },
  paragraphContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  paragraphDecoration: {
    alignItems: 'center',
    paddingTop: 4,
  },
  paragraphDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  paragraphLine: {
    width: 2,
    flex: 1,
    borderRadius: 1,
  },
  bodyText: {
    flex: 1,
    fontWeight: '400',
  },
  quoteContainer: {
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 6,
  },
  quoteText: {
    fontWeight: '600',
    fontStyle: 'italic',
  },
  foundersCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  foundersHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 12,
    opacity: 0.85,
  },
  sectionDivider: {
    width: 44,
    height: 3,
    borderRadius: 999,
  },
  founderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  founderScroll: {
    flexDirection: 'row',
    paddingBottom: 4,
    gap: 16,
    paddingHorizontal: 4,
  },
  founderCard: {
    alignItems: 'center',
    width: 170,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  founderImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  founderImageGlow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 60,
  },
  founderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1,
  },
  founderImageRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 55,
    borderWidth: 2,
  },
  founderName: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  founderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  founderRole: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
});