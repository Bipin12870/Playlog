export type GameSummary = {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  cover?: { url?: string | null };
  platforms?: { slug?: string | null; abbreviation?: string | null }[];
  first_release_date?: number;
};

export type GameDetailsData = GameSummary & {
  developer?: string | null;
  releaseYear?: number | null;
  ratingLabel?: string | null;
  bannerUrl?: string | null;
  mediaUrl?: string | null;
  description?: string | null;
  genres?: { id: number; name?: string | null }[] | null;
};

export type GameReview = {
  id: string;
  userId: string;
  author: string;
  body: string;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
};
