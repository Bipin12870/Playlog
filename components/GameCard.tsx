import { Ionicons } from '@expo/vector-icons';
import {
  Image,
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
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
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
  onToggleFavorite,
  isFavorite = false,
}: GameCardProps) {
  const coverUri = resolveCoverUri(game.cover?.url ?? null);
  const ratingDisplay = resolveRating(game.rating);
  const platformIcons = extractPlatformIcons(game.platforms);
  const HeartComponent = onToggleFavorite ? Pressable : View;
  const baseCardStyle = [styles.card, containerStyle];

  const cardContents = (
    <>
      <View style={styles.thumbnailWrapper}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Text style={styles.thumbnailFallbackText}>No art</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {game.name}
          </Text>
          <HeartComponent
            onPress={onToggleFavorite}
            style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
            accessibilityRole={onToggleFavorite ? 'button' : undefined}
            accessibilityLabel="Toggle favourite"
            hitSlop={8}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#f8fafc' : '#f472b6'}
            />
          </HeartComponent>
        </View>

        {ratingDisplay ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#fbbf24" style={styles.ratingIcon} />
            <Text style={styles.ratingText}>{ratingDisplay}/10</Text>
          </View>
        ) : null}

        {platformIcons.length > 0 && (
          <View style={styles.platformRow}>
            {platformIcons.map((icon) => (
              <Ionicons key={icon} name={icon} size={16} color="#94a3b8" />
            ))}
          </View>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...baseCardStyle, pressed && styles.cardPressed]}
      >
        {cardContents}
      </Pressable>
    );
  }

  return <View style={baseCardStyle}>{cardContents}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 10,
    gap: 8,
  },
  cardPressed: { opacity: 0.85 },
  thumbnailWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    aspectRatio: 2 / 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  thumbnailFallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  body: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 114, 182, 0.12)',
  },
  favoriteBtnActive: {
    backgroundColor: '#f472b6',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingIcon: {
    marginTop: 1,
  },
  ratingText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
