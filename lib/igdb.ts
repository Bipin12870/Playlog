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
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation;
    search "${term}";
    where version_parent = null;
    limit 10;
  `;
  return igdbQuery("games", query);
}

export async function fetchFeaturedGames() {
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation;
    sort total_rating desc;
    where total_rating != null
      & total_rating_count > 100
      & (category = null | category = 0)
      & version_parent = null;
    limit 12;
  `;
  return igdbQuery("games", query);
}

export async function fetchTrendingGames() {
  const now = Math.floor(Date.now() / 1000);
  const threeYearsAgo = now - 3 * 365 * 24 * 60 * 60;
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation;
    where total_rating_count >= 50
      & first_release_date != null
      & first_release_date >= ${threeYearsAgo}
      & (category = null | category = 0)
      & version_parent = null;
    sort total_rating_count desc;
    limit 12;
  `;
  return igdbQuery("games", query);
}

export async function fetchRandomGames() {
  const randomPage = Math.floor(Math.random() * 50);
  const query = `
    fields name, cover.url, summary, rating, first_release_date, platforms.slug, platforms.abbreviation;
    where total_rating_count > 20
      & (category = null | category = 0)
      & version_parent = null;
    sort first_release_date desc;
    limit 12;
    offset ${randomPage * 12};
  `;
  return igdbQuery("games", query);
}
