export type GameSummary = {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  cover?: { url?: string | null };
  platforms?: { slug?: string | null; abbreviation?: string | null }[];
  first_release_date?: number;
};

