import type { GameDetailsData } from '../types/game';

function buildAmazonSearchUrl(query: string) {
  const base = 'https://www.amazon.com.au/s';
  const affiliateTag = 'PLAYLOG-DEMO-20';
  const encoded = encodeURIComponent(query.trim());
  return `${base}?k=${encoded}&tag=${affiliateTag}`;
}

export function getAmazonAffiliateUrl(gameName: string, platform?: string | null) {
  const search = platform ? `${gameName} ${platform}` : gameName;
  return buildAmazonSearchUrl(search);
}

export type AffiliateSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  url: string;
  imageUrl?: string | null;
};

export function getAffiliateSuggestionsForGame(game: GameDetailsData): AffiliateSuggestion[] {
  const platformLabel = game.platforms?.[0]?.abbreviation ?? game.platforms?.[0]?.slug ?? null;
  const gameLabel = `View “${game.name}” on Amazon`;
  const url = buildAmazonSearchUrl(platformLabel ? `${game.name} ${platformLabel}` : game.name);
  const suggestions: AffiliateSuggestion[] = [
    {
      id: 'game',
      label: gameLabel,
      url,
    },
  ];
  console.log('[AFF BASE SUGGESTIONS]', suggestions);
  return suggestions;
}
