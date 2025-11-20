import { fetchGameDetailsById } from './igdb';
import type { GameSummary } from '../types/game';

export type RecommendationEntry = { game_id: number; score: number };
export type RecommendationMap = Record<string, RecommendationEntry[]>;

// Statically bundled JSON produced by the offline recommender script.
// Replace this file before builds with the latest recommendations.
// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const bundled: RecommendationMap = require('../assets/recommendations.json');

function mapRawToSummary(raw: any): GameSummary | null {
  if (!raw || typeof raw?.id !== 'number' || typeof raw?.name !== 'string') {
    return null;
  }

  // Prefer cover art; otherwise fall back to a screenshot/artwork URL.
  const screenshotUrl = Array.isArray(raw?.screenshots)
    ? raw.screenshots.find((shot: any) => shot?.url)?.url ?? null
    : null;
  const artworkUrl = Array.isArray(raw?.artworks)
    ? raw.artworks.find((art: any) => art?.url)?.url ?? null
    : null;
  const mediaUrl = raw?.mediaUrl ?? screenshotUrl ?? artworkUrl ?? null;

  return {
    id: raw.id,
    name: raw.name,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    cover: raw.cover ?? undefined,
    platforms: raw.platforms ?? undefined,
    first_release_date: raw.first_release_date ?? undefined,
    mediaUrl,
  };
}

export function getTopRecommendationEntries(userId: string, limit = 12): RecommendationEntry[] {
  if (!userId) return [];
  const entries = Array.isArray((bundled as RecommendationMap)[userId])
    ? (bundled as RecommendationMap)[userId]
    : [];
  // Already sorted by score in the export; trim for safety.
  return entries.slice(0, limit);
}

export async function fetchRecommendedGames(
  userId: string,
  limit = 12,
): Promise<GameSummary[]> {
  const entries = getTopRecommendationEntries(userId, limit);
  if (!entries.length) {
    return [];
  }

  const tasks = entries.map(async (entry) => {
    try {
      const response = await fetchGameDetailsById(entry.game_id);
      const rawList: any[] = Array.isArray(response) ? response : [];
      const raw = rawList[0];
      return mapRawToSummary(raw);
    } catch (error) {
      console.warn('Failed to fetch recommended game details', error);
      return null;
    }
  });

  const results = await Promise.all(tasks);
  const deduped: GameSummary[] = [];
  const seen = new Set<number>();

  results.forEach((game) => {
    if (game && !seen.has(game.id)) {
      deduped.push(game);
      seen.add(game.id);
    }
  });

  return deduped.slice(0, limit);
}
