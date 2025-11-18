import type { GameSummary } from '../types/game';

const API_BASE = "https://playlog-igdb-proxy-5j9ckofks-bipin12870s-projects.vercel.app/api/igdb";

export async function igdbQuery(endpoint: string, query: string) {
  const res = await fetch(`${API_BASE}?endpoint=${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });
  if (!res.ok) throw new Error(`IGDB query failed: ${res.status}`);
  return res.json();
}

export async function searchGames(term: string) {
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation, screenshots.url, artworks.url;
    search "${term}";
    where version_parent = null;
    limit 10;
  `;
  return mapGameSummaries(await igdbQuery("games", query));
}

export async function fetchFeaturedGames() {
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation, screenshots.url, artworks.url;
    sort total_rating desc;
    where total_rating != null
      & total_rating_count > 100
      & (category = null | category = 0)
      & version_parent = null;
    limit 12;
  `;
  return mapGameSummaries(await igdbQuery("games", query));
}

export async function fetchTrendingGames() {
  const now = Math.floor(Date.now() / 1000);
  const threeYearsAgo = now - 3 * 365 * 24 * 60 * 60;
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation, screenshots.url, artworks.url;
    where total_rating_count >= 50
      & first_release_date != null
      & first_release_date >= ${threeYearsAgo}
      & (category = null | category = 0)
      & version_parent = null;
    sort total_rating_count desc;
    limit 12;
  `;
  return mapGameSummaries(await igdbQuery("games", query));
}

export async function fetchRandomGames() {
  const randomPage = Math.floor(Math.random() * 50);
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation, screenshots.url, artworks.url;
    where total_rating_count > 20
      & (category = null | category = 0)
      & version_parent = null;
    sort first_release_date desc;
    limit 12;
    offset ${randomPage * 12};
  `;
  return mapGameSummaries(await igdbQuery("games", query));
}

export async function fetchGameDetailsById(id: number) {
  const query = `
    fields
      name,
      cover.url,
      summary,
      storyline,
      rating,
      total_rating,
      total_rating_count,
      first_release_date,
      platforms.slug,
      platforms.abbreviation,
      involved_companies.developer,
      involved_companies.company.name,
      genres.id,
      genres.name,
      artworks.url,
      screenshots.url,
      videos.video_id,
      videos.name;
    where id = ${id};
    limit 1;
  `;
  return igdbQuery("games", query);
}

export async function fetchSimilarGamesByGenres(genreIds: number[], excludeId: number) {
  if (!genreIds.length) return [];
  const uniqueIds = Array.from(new Set(genreIds));
  const genreList = uniqueIds.join(",");
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation, screenshots.url, artworks.url;
    where genres != null
      & genres = (${genreList})
      & id != ${excludeId}
      & (category = null | category = 0)
      & version_parent = null
      & total_rating_count > 10;
    sort total_rating desc;
    limit 12;
  `;
  return mapGameSummaries(await igdbQuery("games", query));
}

function mapGameSummaries(payload: any): GameSummary[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((game) => typeof game?.id === 'number' && game?.name)
    .map((game) => {
      const mediaUrl = pickMediaUrl(game);
      return {
        id: game.id,
        name: game.name,
        summary: game.summary ?? undefined,
        rating: typeof game.rating === 'number' ? game.rating : undefined,
        cover: game.cover ?? undefined,
        platforms: game.platforms ?? undefined,
        first_release_date: game.first_release_date ?? undefined,
        mediaUrl,
      } satisfies GameSummary;
    });
}

function pickMediaUrl(game: any): string | null | undefined {
  if (game?.mediaUrl) return game.mediaUrl;
  const screenshot = Array.isArray(game?.screenshots)
    ? game.screenshots.find((shot: any) => shot?.url)?.url
    : null;
  if (screenshot) return screenshot;
  const artwork = Array.isArray(game?.artworks)
    ? game.artworks.find((art: any) => art?.url)?.url
    : null;
  if (artwork) return artwork;
  return game?.cover?.url ?? null;
}
