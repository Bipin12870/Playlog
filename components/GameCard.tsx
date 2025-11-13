import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type PlatformInfo = {
  slug?: string | null;
  abbreviation?: string | null;
};

type GameCardProps = {
  game: {
    id: number;
    name: string;
    rating?: number;
    cover?: { url?: string | null };
    platforms?: PlatformInfo[] | null;
  };
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

const ICON_MAP: Array<{ match: RegExp; icon: keyof typeof Ionicons.glyphMap }> = [
  { match: /(pc|win|windows)/i, icon: 'logo-windows' },
  { match: /(xbox)/i, icon: 'logo-xbox' },
  { match: /(playstation|ps[1-5]|psp|vita)/i, icon: 'logo-playstation' },
  { match: /(nintendo|switch)/i, icon: 'game-controller' },
  { match: /(mac|apple)/i, icon: 'logo-apple' },
];

function resolveCoverUri(raw?: string | null) {
  if (!raw) return undefined;
  const normalized = raw
    .replace('t_thumb', 't_cover_big')
    .replace('t_cover_big', 't_720p');
  return normalized.startsWith('http') ? normalized : `https:${normalized}`;
}

function resolveRating(rating?: number) {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return null;
  return (rating / 10).toFixed(1);
}

function extractPlatformIcons(platforms?: PlatformInfo[] | null) {
  if (!platforms?.length) return [];

  const icons = new Set<keyof typeof Ionicons.glyphMap>();

  platforms.forEach((platform) => {
    const slug = platform.slug ?? platform.abbreviation;
    if (!slug) return;
    const mapping = ICON_MAP.find(({ match }) => match.test(slug));
    if (mapping) icons.add(mapping.icon);
  });

  return Array.from(icons);
}

export function GameCard({
  game,
  containerStyle,
  onPress,
}: GameCardProps) {
  const isWeb = Platform.OS === 'web';
  const showTitleBar = !isWeb;
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const coverUri = resolveCoverUri(game.cover?.url ?? null);
  const ratingDisplay = resolveRating(game.rating);
  const platformIcons = extractPlatformIcons(game.platforms);
  const baseCardStyle = [styles.card, containerStyle];

  const renderCard = (overlayVisible: boolean) => (
    <View style={styles.surface}>
      <View style={styles.coverShell}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverFallback}>
            <Text style={styles.coverFallbackText}>No cover art</Text>
          </View>
        )}
        <View style={styles.coverEdge} />
        {showTitleBar && (
          <View pointerEvents="none" style={styles.titleBar}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.titleText}>
              {game.name}
            </Text>
          </View>
        )}
        <View
          pointerEvents="none"
          style={[
            styles.infoOverlay,
            overlayVisible && styles.infoOverlayVisible,
          ]}
        >
          <View style={styles.infoPanel}>
            <Text style={styles.overlayTitle} numberOfLines={2}>
              {game.name}
            </Text>
            <View style={styles.overlayMetaRow}>
              {ratingDisplay ? (
                <View style={styles.overlayBadge}>
                  <Ionicons name="star" size={12} color="#fbbf24" />
                  <Text style={styles.overlayBadgeText}>{ratingDisplay}/10</Text>
                </View>
              ) : (
                <Text style={styles.overlayMetaMuted}>Rating unavailable</Text>
              )}
              {platformIcons.length > 0 ? (
                <View style={styles.overlayBadgeRow}>
                  {platformIcons.slice(0, 3).map((icon) => (
                    <View key={icon} style={styles.platformChip}>
                      <Ionicons name={icon} size={12} color="#e2e8f0" />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.overlayMetaMuted}>Platforms TBD</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    const handleHoverIn = () => {
      if (Platform.OS === 'web') {
        setIsHovered(true);
      }
    };

    const handleHoverOut = () => {
      if (Platform.OS === 'web') {
        setIsHovered(false);
      }
    };

    const overlayVisible = isWeb && (isHovered || isActive);

    return (
      <Pressable
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onPressIn={() => {
          if (isWeb) setIsActive(true);
        }}
        onPressOut={() => {
          if (isWeb) setIsActive(false);
        }}
        style={({ pressed }) => [
          ...baseCardStyle,
          pressed && styles.cardPressed,
          isWeb && (isHovered || isActive) && styles.cardRaised,
        ]}
      >
        {renderCard(overlayVisible)}
      </Pressable>
    );
  }

  return <View style={baseCardStyle}>{renderCard(false)}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070b14',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 10,
  },
  cardPressed: { opacity: 0.92 },
  cardRaised: {
    transform: [{ scale: 1.035 }],
    shadowOpacity: 0.55,
    shadowRadius: 34,
    elevation: 18,
  },
  surface: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  coverShell: {
    aspectRatio: 2 / 3,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  coverFallbackText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  coverEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.12)',
    borderRadius: 20,
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 8, 20, 0.08)',
    opacity: 0,
    justifyContent: 'flex-end',
    padding: 12,
  },
  infoOverlayVisible: {
    opacity: 1,
    backgroundColor: 'rgba(5, 8, 20, 0.55)',
  },
  infoPanel: {
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    gap: 8,
  },
  titleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  overlayTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  overlayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  overlayMetaMuted: {
    color: '#94a3b8',
    fontSize: 13,
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  overlayBadgeText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '600',
  },
  overlayBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  platformChip: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    padding: 6,
    borderRadius: 999,
  },
});
