import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { GameDetails } from '../../components/home';
import type { GameDetailsData, GameReview, GameSummary } from '../../types/game';
import {
  fetchGameDetailsById,
  fetchSimilarGamesByGenres,
  fetchTrendingGames,
} from '../../lib/igdb';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useUserProfile } from '../../lib/userProfile';
import { useGameDetailsCache } from '../../lib/hooks/useGameDetailsCache';
import {
  CONTENT_BLOCKED_ERROR,
  MAX_REVIEWS_PER_USER,
  setGameFavorite,
  submitGameReview,
  submitReviewReply,
  updateReviewReply,
  deleteReviewReply,
  subscribeToFavoriteStatus,
  subscribeToGameReviewStats,
  subscribeToGameReviews,
  subscribeToUserReviewStats,
} from '../../lib/community';
import { useBlockRelationships } from '../../lib/hooks/useBlockRelationships';
import { useAffiliateOverrides } from '../../lib/hooks/useAffiliateOverrides';
import {
  getAmazonAffiliateUrl,
  getAffiliateSuggestionsForGame,
  type AffiliateSuggestion,
} from '../../lib/affiliate';
// import { seedAffiliateDefaults } from '../../lib/seedAffiliateDefaults';
// import { seedAffiliateDefaults } from '../../lib/seedAffiliateDefaults';

type IgdbCompany = {
  developer?: boolean;
  company?: { name?: string | null } | null;
};

type IgdbImage = { url?: string | null } | null;
type IgdbVideo = { video_id?: string | null; name?: string | null } | null;

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
  videos?: IgdbVideo[] | null;
};

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const accentColor = colors.accent;
  const dangerColor = colors.danger;
  const { user } = useAuthUser();
  const { profile } = useUserProfile(user?.uid ?? null);
  const blockRelationships = useBlockRelationships(user?.uid ?? null);
  const { cacheReady, getCachedDetails, cacheGameDetails } = useGameDetailsCache();

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
  const [replySubmittingIds, setReplySubmittingIds] = useState<string[]>([]);
  const [replyUpdatingIds, setReplyUpdatingIds] = useState<string[]>([]);
  const [replyDeletingIds, setReplyDeletingIds] = useState<string[]>([]);
  const planId =
    profile?.planId ??
    profile?.currentPlanId ??
    (profile?.premium ? 'PREMIUM' : 'FREE');
  const isPremium = planId === 'PREMIUM';

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

    if (!cacheReady) {
      setLoading(true);
      return;
    }

    const gameId = numericId;
    let isCancelled = false;

    const cached = getCachedDetails(gameId);
    if (cached) {
      setError(null);
      setGame(cached.details);
      setSimilarGames(cached.similar);
      setLoading(false);
      return () => {
        isCancelled = true;
      };
    }

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

        const genreIds = (rawGame.genres ?? [])
          .map((genre) => genre?.id)
          .filter((value): value is number => typeof value === 'number');

        let resolvedSimilar: GameSummary[] = [];

        try {
          const similarResponse = genreIds.length
            ? await fetchSimilarGamesByGenres(genreIds, rawGame.id)
            : [];
          const similarList: GameSummary[] = Array.isArray(similarResponse)
            ? similarResponse.map(mapToSummary).filter(Boolean)
            : [];
          if (similarList.length) {
            resolvedSimilar = similarList.slice(0, 12);
          }
        } catch (similarError) {
          console.warn('Failed to load similar games', similarError);
        }

        if (!resolvedSimilar.length) {
          try {
            const fallbackResponse = await fetchTrendingGames();
            const fallbackList: GameSummary[] = Array.isArray(fallbackResponse)
              ? fallbackResponse
                  .filter((candidate) => candidate?.id !== rawGame.id)
                  .map(mapToSummary)
                  .filter(Boolean)
              : [];
            resolvedSimilar = fallbackList.slice(0, 12);
          } catch (fallbackError) {
            console.warn('Failed to load fallback games', fallbackError);
          }
        }

        if (!isCancelled) {
          setGame(mappedDetails);
          setSimilarGames(resolvedSimilar);
          cacheGameDetails(gameId, { details: mappedDetails, similar: resolvedSimilar });
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
  }, [
    cacheGameDetails,
    cacheReady,
    getCachedDetails,
    idMissing,
    numericId,
  ]);

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

  const filteredReviews = useMemo(() => {
    if (!reviews.length) {
      return [];
    }
    const viewerUid = user?.uid ?? null;
    const blockedSet = new Set(blockRelationships.blockedIds);
    const blockedBySet = new Set(blockRelationships.blockedByIds);

    const shouldHideAuthor = (authorId?: string | null) => {
      if (!authorId) return false;
      if (viewerUid && authorId === viewerUid) {
        return false;
      }
      return blockedSet.has(authorId) || blockedBySet.has(authorId);
    };

    return reviews
      .filter((review) => !shouldHideAuthor(review.userId))
      .map((review) => {
        const replies = Array.isArray(review.replies) ? review.replies : [];
        const filteredReplies = replies.filter((reply) => !shouldHideAuthor(reply.userId));
        if (filteredReplies.length === replies.length) {
          return review;
        }
        return {
          ...review,
          replies: filteredReplies,
        };
      });
  }, [reviews, blockRelationships.blockedIds, blockRelationships.blockedByIds, user?.uid]);

  const userReview = useMemo(
    () => filteredReviews.find((review) => review.userId === user?.uid) ?? null,
    [filteredReviews, user?.uid],
  );

  const personalReviewLimitReached =
    !isPremium && typeof userReviewCount === 'number' && userReviewCount >= MAX_REVIEWS_PER_USER;
  const reviewLimitReached = personalReviewLimitReached && !userReview;
  const reviewLimit = isPremium ? Number.POSITIVE_INFINITY : MAX_REVIEWS_PER_USER;

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
        await submitGameReview(
          gameId,
          user,
          {
            ...input,
            game: {
              id: currentGame.id,
              name: currentGame.name,
              cover: currentGame.cover ?? null,
            },
          },
          { skipReviewLimit: isPremium },
        );
      } catch (err) {
        if (err instanceof Error) {
          switch (err.message) {
            case CONTENT_BLOCKED_ERROR:
              throw new Error('Please remove offensive or abusive language before posting.');
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
    [numericId, user, game, isPremium],
  );

  const handleSubmitReply = useCallback(
    async (reviewId: string, input: { body: string }) => {
      const gameId = numericId;
      if (gameId === null) {
        throw new Error('Missing game context for reply.');
      }
      if (!user) {
        throw new Error('Sign in to reply to reviews.');
      }
      const trimmed = input.body?.trim() ?? '';
      if (!trimmed) {
        throw new Error('Reply text is required.');
      }

      setReplySubmittingIds((prev) => (prev.includes(reviewId) ? prev : [...prev, reviewId]));
      try {
        await submitReviewReply(gameId, reviewId, user, { body: trimmed });
      } catch (err) {
        if (err instanceof Error) {
          switch (err.message) {
            case 'REVIEW_NOT_FOUND':
              throw new Error('This review is no longer available.');
            case CONTENT_BLOCKED_ERROR:
              throw new Error('Please remove offensive or abusive language before posting.');
            case 'REPLY_BODY_REQUIRED':
              throw new Error('Reply text is required.');
            default:
              throw new Error(err.message || 'Unable to post reply right now.');
          }
        }
        throw new Error('Unable to post reply right now.');
      } finally {
        setReplySubmittingIds((prev) => prev.filter((id) => id !== reviewId));
      }
    },
    [numericId, user],
  );

  const handleUpdateReply = useCallback(
    async (reviewId: string, replyId: string, input: { body: string }) => {
      const gameId = numericId;
      if (gameId === null) {
        throw new Error('Missing game context for reply.');
      }
      if (!user) {
        throw new Error('Sign in to update replies.');
      }
      const trimmed = input.body?.trim() ?? '';
      if (!trimmed) {
        throw new Error('Reply text is required.');
      }

      setReplyUpdatingIds((prev) => (prev.includes(replyId) ? prev : [...prev, replyId]));
      try {
        await updateReviewReply(gameId, reviewId, replyId, user, { body: trimmed });
      } catch (err) {
        if (err instanceof Error) {
          switch (err.message) {
            case 'REPLY_NOT_FOUND':
              throw new Error('This reply is no longer available.');
            case 'REPLY_FORBIDDEN':
              throw new Error('You can only edit your own replies.');
            case CONTENT_BLOCKED_ERROR:
              throw new Error('Please remove offensive or abusive language before posting.');
            case 'REPLY_BODY_REQUIRED':
              throw new Error('Reply text is required.');
            default:
              throw new Error(err.message || 'Unable to update reply right now.');
          }
        }
        throw new Error('Unable to update reply right now.');
      } finally {
        setReplyUpdatingIds((prev) => prev.filter((id) => id !== replyId));
      }
    },
    [numericId, user],
  );

  const handleDeleteReply = useCallback(
    async (reviewId: string, replyId: string) => {
      const gameId = numericId;
      if (gameId === null) {
        throw new Error('Missing game context for reply.');
      }
      if (!user) {
        throw new Error('Sign in to remove replies.');
      }

      setReplyDeletingIds((prev) => (prev.includes(replyId) ? prev : [...prev, replyId]));
      try {
        await deleteReviewReply(gameId, reviewId, replyId, user);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          switch (err.message) {
            case 'REPLY_NOT_FOUND':
              throw new Error('This reply is no longer available.');
            case 'REPLY_FORBIDDEN':
              throw new Error('You can only delete your own replies.');
            default:
              throw new Error(err.message || 'Unable to remove reply right now.');
          }
        }
        throw new Error('Unable to remove reply right now.');
      } finally {
        setReplyDeletingIds((prev) => prev.filter((id) => id !== replyId));
      }
    },
    [numericId, user],
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

  const affiliateOverrides = useAffiliateOverrides();

  const handleOpenAffiliate = useCallback(() => {
    if (!game) {
      return;
    }
    const platforms = game.platforms ?? [];
    let primaryPlatform: string | null = null;
    for (const entry of platforms) {
      if (entry?.abbreviation) {
        primaryPlatform = entry.abbreviation;
        break;
      }
    }
    if (!primaryPlatform) {
      for (const entry of platforms) {
        if (entry?.slug) {
          primaryPlatform = entry.slug;
          break;
        }
      }
    }
    const url = getAmazonAffiliateUrl(game.name, primaryPlatform);
    Linking.openURL(url).catch((err) => {
      console.error('Unable to open affiliate link', err);
    });
  }, [game]);

  const affiliateSuggestions = useMemo<AffiliateSuggestion[]>(() => {
    if (!game) {
      return [];
    }
    const base = getAffiliateSuggestionsForGame(game);
    const baseById = new Map(base.map((item) => [item.id, item]));
    const merged = base.map((item) => {
      const override = affiliateOverrides[item.id];
      if (!override) {
        return item;
      }
      return {
        ...item,
        url: override.url,
        label: override.label ?? item.label,
        imageUrl: override.imageUrl ?? item.imageUrl,
      };
    });

    if (affiliateOverrides) {
      Object.values(affiliateOverrides).forEach((override) => {
        if (!override || !override.id || baseById.has(override.id)) {
          return;
        }
        merged.push({
          id: override.id,
          label: override.label ?? override.id,
          url: override.url,
          imageUrl: override.imageUrl ?? null,
        });
      });
    }

    return merged;
  }, [affiliateOverrides, game]);

  useEffect(() => {
    console.log('[AFF SUGGESTIONS MERGED]', affiliateSuggestions);
  }, [affiliateSuggestions]);

  // TEMP: run once to seed defaults if needed
  // useEffect(() => {
  //   seedAffiliateDefaults();
  // }, []);

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={accentColor} />
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
          reviews={filteredReviews}
          reviewsLoading={reviewsLoading}
          reviewError={reviewError}
          communityAverage={communityAverage}
          communityReviewCount={communityReviewCount}
          reviewLimit={reviewLimit}
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
          currentUserId={user?.uid ?? null}
          onSubmitReply={handleSubmitReply}
          replySubmittingIds={replySubmittingIds}
          onUpdateReply={handleUpdateReply}
          onDeleteReply={handleDeleteReply}
          replyUpdatingIds={replyUpdatingIds}
          replyDeletingIds={replyDeletingIds}
          similarGames={similarGames}
          onSelectSimilar={handleSelectSimilar}
          onOpenAffiliate={handleOpenAffiliate}
          affiliateSuggestions={affiliateSuggestions}
          onBack={handleGoBack}
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
    bannerUrl: artworkUrl ?? screenshotUrl ?? null,
    mediaUrl: screenshotUrl ?? artworkUrl ?? null,
    trailerUrl: buildTrailerUrl(raw),
    description: raw.storyline ?? raw.summary ?? null,
    genres: raw.genres ?? null,
  };
}

function buildTrailerUrl(raw: IgdbGame): string | null {
  if (!Array.isArray(raw.videos)) {
    return null;
  }
  const entry = raw.videos.find(
    (video) => typeof video?.video_id === 'string' && video.video_id.trim().length > 0,
  );
  if (!entry || typeof entry.video_id !== 'string') {
    return null;
  }
  const videoId = entry.video_id.trim();
  if (!videoId) return null;
  if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
    return videoId;
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function mapToSummary(raw: IgdbGame | GameSummary): GameSummary {
  const anyRaw = raw as any;
  const screenshotUrl = Array.isArray(anyRaw?.screenshots)
    ? anyRaw.screenshots.find((shot: IgdbImage) => shot?.url)?.url ?? null
    : null;
  const artworkUrl = Array.isArray(anyRaw?.artworks)
    ? anyRaw.artworks.find((art: IgdbImage) => art?.url)?.url ?? null
    : null;
  const mediaUrl = anyRaw?.mediaUrl ?? screenshotUrl ?? artworkUrl ?? null;

  return {
    id: raw.id,
    name: raw.name,
    summary: raw.summary ?? undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    cover: raw.cover ?? undefined,
    platforms: raw.platforms ?? undefined,
    first_release_date: raw.first_release_date ?? undefined,
    mediaUrl,
  };
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const accent = colors.accent;
  const danger = colors.danger;

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    errorText: {
      color: danger,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 12,
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 999,
      backgroundColor: accent,
    },
    retryButtonPressed: {
      backgroundColor: isDark ? `${accent}cc` : `${accent}e6`,
    },
    retryLabel: {
      color: isDark ? colors.text : '#ffffff',
      fontWeight: '600',
    },
  });
}
