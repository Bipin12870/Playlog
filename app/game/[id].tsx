import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GameDetails } from '../../components/home';
import type { GameDetailsData, GameReview, GameSummary } from '../../types/game';
import {
  fetchGameDetailsById,
  fetchSimilarGamesByGenres,
  fetchTrendingGames,
} from '../../lib/igdb';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import {
  MAX_REVIEWS_PER_USER,
  setGameFavorite,
  submitGameReview,
  subscribeToFavoriteStatus,
  subscribeToGameReviewStats,
  subscribeToGameReviews,
  subscribeToUserReviewStats,
} from '../../lib/community';

type IgdbCompany = {
  developer?: boolean;
  company?: { name?: string | null } | null;
};

type IgdbImage = { url?: string | null } | null;

type IgdbGame = {
  id: number;
  name: string;
  summary?: string | null;
  storyline?: string | null;
  rating?: number | null;
  total_rating?: number | null;
  total_rating_count?: number | null;
  first_release_date?: number | null;
  cover?: { url?: string | null } | null;
  platforms?: { slug?: string | null; abbreviation?: string | null }[] | null;
  involved_companies?: IgdbCompany[] | null;
  genres?: { id: number; name?: string | null }[] | null;
  artworks?: IgdbImage[] | null;
  screenshots?: IgdbImage[] | null;
};

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuthUser();

  const isIdArray = Array.isArray(id);
  const idMissing = !id || isIdArray;
  const numericId = useMemo(() => {
    if (idMissing) return null;
    const parsed = Number(id as string);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id, idMissing]);

  const [game, setGame] = useState<GameDetailsData | null>(null);
  const [similarGames, setSimilarGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<GameReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [communityAverage, setCommunityAverage] = useState<number | null>(null);
  const [communityReviewCount, setCommunityReviewCount] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userReviewCount, setUserReviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (idMissing) {
      setError('Missing game identifier.');
      setGame(null);
      setSimilarGames([]);
      setLoading(false);
      return;
    }

    if (numericId === null) {
      setError('Invalid game identifier.');
      setGame(null);
      setSimilarGames([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const gameId = numericId;

    async function load() {
      setLoading(true);
      setError(null);
      setGame(null);
      setSimilarGames([]);

      try {
        const response = await fetchGameDetailsById(gameId);
        const rawList: IgdbGame[] = Array.isArray(response) ? response : [];
        const rawGame = rawList[0];

        if (!rawGame) {
          if (!isCancelled) {
            setError('Game not found.');
          }
          return;
        }

        const mappedDetails = mapToDetails(rawGame);
        if (!isCancelled) {
          setGame(mappedDetails);
        }

        const genreIds = (rawGame.genres ?? [])
          .map((genre) => genre?.id)
          .filter((value): value is number => typeof value === 'number');

        try {
          const similarResponse = genreIds.length
            ? await fetchSimilarGamesByGenres(genreIds, rawGame.id)
            : [];
          const similarList: GameSummary[] = Array.isArray(similarResponse)
            ? similarResponse.map(mapToSummary).filter(Boolean)
            : [];

          if (!isCancelled && similarList.length) {
            setSimilarGames(similarList.slice(0, 12));
            return;
          }
        } catch (similarError) {
          console.warn('Failed to load similar games', similarError);
        }

        // Fallback to trending titles if we could not determine genre-based matches.
        try {
          const fallbackResponse = await fetchTrendingGames();
          const fallbackList: GameSummary[] = Array.isArray(fallbackResponse)
            ? fallbackResponse
                .filter((candidate) => candidate?.id !== rawGame.id)
                .map(mapToSummary)
                .filter(Boolean)
            : [];

          if (!isCancelled) {
            setSimilarGames(fallbackList.slice(0, 12));
          }
        } catch (fallbackError) {
          console.warn('Failed to load fallback games', fallbackError);
        }
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setError('Unable to load game details right now. Please try again later.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [idMissing, numericId]);

  useEffect(() => {
    const gameId = numericId;
    if (gameId === null) {
      setReviews([]);
      setReviewsLoading(false);
      setReviewError(null);
      return;
    }
    setReviewsLoading(true);
    const unsubscribe = subscribeToGameReviews(
      gameId,
      (next) => {
        setReviews(next);
        setReviewsLoading(false);
        setReviewError(null);
      },
      (err) => {
        console.error(err);
        setReviewError('Unable to load community reviews right now.');
        setReviewsLoading(false);
      },
    );
    return unsubscribe;
  }, [numericId]);

  useEffect(() => {
    const gameId = numericId;
    if (gameId === null) {
      setCommunityAverage(null);
      setCommunityReviewCount(0);
      return;
    }
    const unsubscribe = subscribeToGameReviewStats(
      gameId,
      (stats) => {
        setCommunityAverage(
          typeof stats.averageRating === 'number' && !Number.isNaN(stats.averageRating)
            ? stats.averageRating
            : null,
        );
        setCommunityReviewCount(stats.reviewCount);
      },
      (err) => {
        console.error(err);
      },
    );
    return unsubscribe;
  }, [numericId]);

  useEffect(() => {
    const gameId = numericId;
    if (!user?.uid || gameId === null) {
      setIsFavorite(false);
      setFavoriteError(null);
      return;
    }
    const unsubscribe = subscribeToFavoriteStatus(
      user.uid,
      gameId,
      (status) => {
        setIsFavorite(status);
        setFavoriteError(null);
      },
      (err) => {
        console.error(err);
        setFavoriteError('Unable to load favourite status.');
      },
    );
    return unsubscribe;
  }, [user?.uid, numericId]);

  useEffect(() => {
    const userId = user?.uid;
    if (!userId) {
      setUserReviewCount(null);
      return;
    }
    const unsubscribe = subscribeToUserReviewStats(
      userId,
      (count) => {
        setUserReviewCount(count);
      },
      (err) => {
        console.error(err);
      },
    );
    return unsubscribe;
  }, [user?.uid]);

  const userReview = useMemo(
    () => reviews.find((review) => review.userId === user?.uid) ?? null,
    [reviews, user?.uid],
  );

  const personalReviewLimitReached =
    typeof userReviewCount === 'number' && userReviewCount >= MAX_REVIEWS_PER_USER;
  const reviewLimitReached = personalReviewLimitReached && !userReview;

  const canSubmitReview = Boolean(user && game && (!reviewLimitReached || userReview));

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [router]);

  const handleSignIn = useCallback(() => {
    router.push('/login');
  }, [router]);

  const handleSignUp = useCallback(() => {
    router.push('/signup');
  }, [router]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!game || numericId === null) {
      return;
    }
    try {
      setFavoriteError(null);
      setFavoriteBusy(true);
      await setGameFavorite(user.uid, game, !isFavorite);
    } catch (err) {
      console.error(err);
      setFavoriteError('Unable to update favourites right now.');
    } finally {
      setFavoriteBusy(false);
    }
  }, [user, router, game, numericId, isFavorite]);

  const handleSubmitReview = useCallback(
    async (input: { rating: number; body: string }) => {
      const gameId = numericId;
      const currentGame = game;
      if (gameId === null) {
        throw new Error('Missing game context for review.');
      }
      if (!currentGame) {
        throw new Error('Missing game context for review.');
      }
      if (!user) {
        throw new Error('Sign in to share your review.');
      }
      setReviewSubmitting(true);
      try {
        await submitGameReview(gameId, user, {
          ...input,
          game: {
            id: currentGame.id,
            name: currentGame.name,
            cover: currentGame.cover ?? null,
          },
        });
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          switch (err.message) {
            case 'REVIEW_LIMIT_REACHED':
              throw new Error('You have used all available review slots. Update an existing review instead.');
            case 'INVALID_RATING_RANGE':
              throw new Error('Rating must be between 0 and 10.');
            case 'REVIEW_BODY_REQUIRED':
              throw new Error('Review text is required.');
            default:
              throw new Error(err.message || 'Unable to submit review right now.');
          }
        }
        throw new Error('Unable to submit review right now.');
      } finally {
        setReviewSubmitting(false);
      }
    },
    [numericId, user, game],
  );

  const handleSelectSimilar = useCallback(
    (selected: GameSummary) => {
      router.replace({
        pathname: '/game/[id]',
        params: { id: selected.id.toString(), name: selected.name },
      });
    },
    [router]
  );

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.backButtonContainer}>
        <Pressable
          onPress={handleGoBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={18} color="#f8fafc" />
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.retryLabel}>Back to Home</Text>
          </Pressable>
        </View>
      ) : game ? (
        <GameDetails
          game={game}
          isAuthenticated={Boolean(user)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          reviewError={reviewError}
          communityAverage={communityAverage}
          communityReviewCount={communityReviewCount}
          reviewLimit={MAX_REVIEWS_PER_USER}
          reviewLimitReached={reviewLimitReached}
          canSubmitReview={canSubmitReview}
          reviewSubmitting={reviewSubmitting}
          onSubmitReview={handleSubmitReview}
          userReview={userReview}
          userReviewCount={userReviewCount ?? 0}
          favoriteDisabled={favoriteBusy}
          favoriteError={favoriteError}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={isFavorite}
          similarGames={similarGames}
          onSelectSimilar={handleSelectSimilar}
        />
      ) : null}
    </View>
  );
}

function mapToDetails(raw: IgdbGame): GameDetailsData {
  const developerEntry = (raw.involved_companies ?? []).find(
    (company) => company?.developer && company?.company?.name
  );

  const artworkUrl = raw.artworks?.find((art) => art?.url)?.url ?? null;
  const screenshotUrl = raw.screenshots?.find((shot) => shot?.url)?.url ?? null;

  const releaseYear =
    raw.first_release_date && Number.isFinite(raw.first_release_date)
      ? new Date(raw.first_release_date * 1000).getFullYear()
      : null;

  return {
    id: raw.id,
    name: raw.name,
    summary: raw.summary ?? undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    cover: raw.cover ?? undefined,
    platforms: raw.platforms ?? undefined,
    first_release_date: raw.first_release_date ?? undefined,
    developer: developerEntry?.company?.name ?? null,
    releaseYear,
    ratingLabel: deriveRatingLabel(raw),
    bannerUrl: artworkUrl ?? screenshotUrl ?? null,
    mediaUrl: screenshotUrl ?? artworkUrl ?? null,
    description: raw.storyline ?? raw.summary ?? null,
    genres: raw.genres ?? null,
  };
}

function mapToSummary(raw: IgdbGame | GameSummary): GameSummary {
  return {
    id: raw.id,
    name: raw.name,
    summary: raw.summary ?? undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    cover: raw.cover ?? undefined,
    platforms: raw.platforms ?? undefined,
    first_release_date: raw.first_release_date ?? undefined,
  };
}

function deriveRatingLabel(raw: IgdbGame) {
  if (typeof raw.total_rating !== 'number') return null;
  const base = (raw.total_rating / 10).toFixed(1);
  const voteCount =
    typeof raw.total_rating_count === 'number' && raw.total_rating_count > 0
      ? ` from ${raw.total_rating_count} votes`
      : '';
  return `${base}/10 Community${voteCount}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 40,
    left: 24,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(15, 23, 42, 1)',
  },
  backButtonLabel: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  retryButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  retryLabel: {
    color: '#f8fafc',
    fontWeight: '600',
  },
});
