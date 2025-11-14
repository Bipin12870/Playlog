export type GameSummary = {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  cover?: { url?: string | null };
  bannerUrl?: string | null;
  mediaUrl?: string | null;
  platforms?: { slug?: string | null; abbreviation?: string | null }[];
  first_release_date?: number;
  genres?: { id: number; name?: string | null }[] | null;
};

export type GameReviewReply = {
  id: string;
  reviewId: string;
  userId: string;
  author: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GameDetailsData = GameSummary & {
  developer?: string | null;
  releaseYear?: number | null;
  bannerUrl?: string | null;
  mediaUrl?: string | null;
  trailerUrl?: string | null;
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
  replies?: GameReviewReply[];
};

export type UserReviewSummary = {
  id: string;
  gameId: number;
  gameName: string;
  rating: number;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  gameCover?: { url?: string | null } | null;
};
