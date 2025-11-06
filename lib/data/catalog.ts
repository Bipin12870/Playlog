import type { GameDetailsData, GameSummary } from '../../types/game';
import { LOCAL_GAMES } from './localGames';

function normalizeSummary(game: GameDetailsData): GameSummary {
  return {
    id: game.id,
    name: game.name,
    summary: game.summary,
    rating: game.rating,
    cover: game.cover,
    platforms: game.platforms,
    first_release_date: game.first_release_date,
  };
}

export function listAllGames(): GameDetailsData[] {
  return LOCAL_GAMES;
}

export function getGameById(id: number): GameDetailsData | undefined {
  return LOCAL_GAMES.find((game) => game.id === id);
}

export function searchLocalGames(term: string, limit = 12): GameSummary[] {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return [];

  const matches = LOCAL_GAMES.filter((game) => {
    const haystack = [game.name, game.summary, game.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedTerm);
  });

  return matches.slice(0, limit).map(normalizeSummary);
}

export function getFeaturedLocalGames(limit = 12): GameSummary[] {
  return [...LOCAL_GAMES]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit)
    .map(normalizeSummary);
}

export function getTrendingLocalGames(limit = 12): GameSummary[] {
  const recentCutoff = new Date().getFullYear() - 3;
  const sorted = [...LOCAL_GAMES].sort((a, b) => {
    const aRecent = (a.releaseYear ?? 0) >= recentCutoff;
    const bRecent = (b.releaseYear ?? 0) >= recentCutoff;
    if (aRecent !== bRecent) {
      return Number(bRecent) - Number(aRecent);
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  return sorted.slice(0, limit).map(normalizeSummary);
}

export function getRandomLocalGames(limit = 12): GameSummary[] {
  const shuffled = [...LOCAL_GAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit).map(normalizeSummary);
}

export function getSimilarGamesByGenres(
  genreIds: number[],
  excludeId: number,
  limit = 12,
): GameSummary[] {
  if (!genreIds.length) return getTrendingLocalGames(limit);
  const uniqueGenres = new Set(genreIds);

  const ranked = LOCAL_GAMES.filter((game) => game.id !== excludeId).map((game) => {
    const overlap =
      game.genres?.reduce((count, genre) => {
        if (genre && uniqueGenres.has(genre.id)) {
          return count + 1;
        }
        return count;
      }, 0) ?? 0;
    return { game, overlap };
  });

  return ranked
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => {
      if (a.overlap !== b.overlap) {
        return b.overlap - a.overlap;
      }
      return (b.game.rating ?? 0) - (a.game.rating ?? 0);
    })
    .slice(0, limit)
    .map((entry) => normalizeSummary(entry.game));
}
