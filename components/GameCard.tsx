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
  const normalized = raw.replace('t_thumb', 't_cover_big');
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
  const ThumbnailWrapper = onPress ? Pressable : View;
  const HeartComponent = onToggleFavorite ? Pressable : View;

  return (
    <View style={[styles.card, containerStyle]}>
      <ThumbnailWrapper onPress={onPress} style={styles.thumbnailWrapper}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Text style={styles.thumbnailFallbackText}>No art</Text>
          </View>
        )}
      </ThumbnailWrapper>

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

        {ratingDisplay && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#fbbf24" style={styles.ratingIcon} />
            <Text style={styles.ratingText}>{ratingDisplay}/10 IGDB</Text>
          </View>
        )}

        {platformIcons.length > 0 && (
          <View style={styles.platformRow}>
            {platformIcons.map((icon) => (
              <Ionicons key={icon} name={icon} size={18} color="#cbd5f5" />
            ))}
          </View>
        )}

        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={({ pressed }) => [
            styles.detailsBtn,
            onPress && pressed && styles.detailsBtnPressed,
            !onPress && styles.detailsBtnDisabled,
          ]}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          <Text style={styles.detailsLabel}>View Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    gap: 16,
  },
  thumbnailWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#374151',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 332 / 187,
  },
  thumbnailFallback: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailFallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 18,
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
    gap: 6,
  },
  ratingIcon: {
    marginTop: 1,
  },
  ratingText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsBtn: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4b5563',
    alignItems: 'center',
  },
  detailsBtnPressed: {
    backgroundColor: '#6366f1',
  },
  detailsBtnDisabled: {
    opacity: 0.6,
  },
  detailsLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
});