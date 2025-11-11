import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { GameCard } from '../GameCard';
import type { GameDetailsData, GameReview, GameSummary } from '../../types/game';

type ReviewFormInput = {
  rating: number;
  body: string;
};

type GameDetailsProps = {
  game: GameDetailsData;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
  similarGames?: GameSummary[];
  onSelectSimilar?: (game: GameSummary) => void;
  reviews?: GameReview[];
  reviewsLoading?: boolean;
  reviewError?: string | null;
  communityAverage?: number | null;
  communityReviewCount?: number;
  reviewLimit?: number;
  reviewLimitReached?: boolean;
  canSubmitReview?: boolean;
  reviewSubmitting?: boolean;
  onSubmitReview?: (input: ReviewFormInput) => Promise<void> | void;
  userReview?: GameReview | null;
  userReviewCount?: number;
  favoriteDisabled?: boolean;
  favoriteError?: string | null;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  currentUserId?: string | null;
  onSubmitReply?: (reviewId: string, input: { body: string }) => Promise<void> | void;
  replySubmittingIds?: string[];
  onUpdateReply?: (
    reviewId: string,
    replyId: string,
    input: { body: string },
  ) => Promise<void> | void;
  onDeleteReply?: (reviewId: string, replyId: string) => Promise<void> | void;
  replyUpdatingIds?: string[];
  replyDeletingIds?: string[];
};

const REVIEW_PLACEHOLDER = 'Share what stood out to you about this game (at least 20 characters).';
const INITIAL_REPLY_PREVIEW_COUNT = 1;
const REPLY_LOAD_INCREMENT = 2;
const INITIAL_COMMUNITY_PREVIEW_COUNT = 3;
const COMMUNITY_LOAD_INCREMENT = 3;

function getInitialVisibleCount(total: number) {
  if (total <= 0) return 0;
  const preview = Math.min(INITIAL_REPLY_PREVIEW_COUNT, total);
  return preview > 0 ? preview : total;
}

export function GameDetails({
  game,
  isAuthenticated = false,
  onSignIn,
  onSignUp,
  similarGames = [],
  onSelectSimilar,
  reviews = [],
  reviewsLoading = false,
  reviewError = null,
  communityAverage = null,
  communityReviewCount = 0,
  reviewLimit,
  reviewLimitReached = false,
  canSubmitReview = false,
  reviewSubmitting = false,
  onSubmitReview,
  userReview = null,
  userReviewCount = 0,
  favoriteDisabled = false,
  favoriteError = null,
  onToggleFavorite,
  isFavorite = false,
  currentUserId = null,
  onSubmitReply,
  replySubmittingIds = [],
  onUpdateReply,
  onDeleteReply,
  replyUpdatingIds = [],
  replyDeletingIds = [],
}: GameDetailsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const coverUri = resolveCoverUri(game.cover?.url ?? null);
  const showcaseUri = resolveCoverUri(game.mediaUrl ?? null) ?? coverUri;
  const heroBackdrop = resolveCoverUri(game.bannerUrl ?? null) ?? showcaseUri ?? coverUri;
  const releaseLine = buildReleaseLine(game);
  const description = game.description ?? game.summary ?? 'No description available.';
  const heroBlurb = useMemo(() => {
    const source = game.description ?? game.summary ?? '';
    const trimmed = source.trim();
    if (!trimmed) return null;
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
  }, [game.description, game.summary]);

  const [ratingInput, setRatingInput] = useState<number | null>(
    typeof userReview?.rating === 'number' ? userReview.rating : null,
  );
  const [reviewInput, setReviewInput] = useState(userReview?.body ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string | null>>({});
  const [replySuccess, setReplySuccess] = useState<Record<string, string | null>>({});
  const [replyEditDrafts, setReplyEditDrafts] = useState<Record<string, string>>({});
  const [replyEditErrors, setReplyEditErrors] = useState<Record<string, string | null>>({});
  const [replyEditSuccess, setReplyEditSuccess] = useState<Record<string, string | null>>({});
  const [replyDeleteErrors, setReplyDeleteErrors] = useState<Record<string, string | null>>({});
  const [editingReplies, setEditingReplies] = useState<string[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyVisibleCounts, setReplyVisibleCounts] = useState<Record<string, number>>({});
  const [visibleCommunityCount, setVisibleCommunityCount] = useState(INITIAL_COMMUNITY_PREVIEW_COUNT);

  useEffect(() => {
    setRatingInput(typeof userReview?.rating === 'number' ? userReview.rating : null);
    setReviewInput(userReview?.body ?? '');
  }, [userReview?.id, userReview?.rating, userReview?.body]);

  useEffect(() => {
    if (!reviewSubmitting && formSuccess) {
      const timeout = setTimeout(() => setFormSuccess(null), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [reviewSubmitting, formSuccess]);

  useEffect(() => {
    const reviewIds = new Set(reviews.map((review) => review.id));
    const replyIds = new Set(
      reviews.flatMap((review) => (review.replies ?? []).map((reply) => reply.id)),
    );

    setReplyDrafts((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (reviewIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplyErrors((prev) => {
      let changed = false;
      const next: Record<string, string | null> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (reviewIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplySuccess((prev) => {
      let changed = false;
      const next: Record<string, string | null> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (reviewIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplyEditDrafts((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (replyIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplyEditErrors((prev) => {
      let changed = false;
      const next: Record<string, string | null> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (replyIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplyEditSuccess((prev) => {
      let changed = false;
      const next: Record<string, string | null> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (replyIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setReplyDeleteErrors((prev) => {
      let changed = false;
      const next: Record<string, string | null> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (replyIds.has(key)) {
          next[key] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setEditingReplies((prev) => {
      const next = prev.filter((id) => replyIds.has(id));
      return next.length === prev.length ? prev : next;
    });

    const nextExpanded: Record<string, boolean> = {};
    reviews.forEach((review) => {
      if (expandedReplies[review.id]) nextExpanded[review.id] = true;
    });
    const expandedKeys = Object.keys(expandedReplies);
    const nextExpandedKeys = Object.keys(nextExpanded);
    const expandedChanged =
      expandedKeys.length !== nextExpandedKeys.length ||
      expandedKeys.some((key) => !nextExpanded[key]);
    if (expandedChanged) {
      setExpandedReplies(nextExpanded);
    }

    const expandedState = expandedChanged ? nextExpanded : expandedReplies;
    const nextVisibleCounts: Record<string, number> = {};
    reviews.forEach((review) => {
      if (!expandedState[review.id]) return;
      const total = review.replies?.length ?? 0;
      if (total <= 0) return;
      const minVisible = getInitialVisibleCount(total);
      const previous = replyVisibleCounts[review.id] ?? minVisible;
      const resolved = Math.min(total, Math.max(previous, minVisible));
      if (resolved > 0) {
        nextVisibleCounts[review.id] = resolved;
      }
    });
    const visibleKeys = Object.keys(replyVisibleCounts);
    const nextVisibleKeys = Object.keys(nextVisibleCounts);
    const visibleChanged =
      visibleKeys.length !== nextVisibleKeys.length ||
      visibleKeys.some((key) => replyVisibleCounts[key] !== nextVisibleCounts[key]);
    if (visibleChanged) {
      setReplyVisibleCounts(nextVisibleCounts);
    }
  }, [reviews, expandedReplies, replyVisibleCounts]);

  const platforms = useMemo(
    () => game.platforms?.slice(0, 6).map((platform, index) => ({
        id: `${platform.slug ?? platform.abbreviation ?? index}`,
        label: platform.abbreviation ?? formatPlatform(platform.slug),
      })) ?? [],
    [game.platforms],
  );

  const reviewCountLabel = communityReviewCount === 1 ? '1 review' : `${communityReviewCount} reviews`;
  const canShowAverage = typeof communityAverage === 'number' && !Number.isNaN(communityAverage);
  const communityAverageValue =
    canShowAverage && typeof communityAverage === 'number'
      ? communityAverage.toFixed(1)
      : null;
  const platformLine = useMemo(
    () => platforms.map((platform) => platform.label).filter(Boolean).slice(0, 4).join(' • '),
    [platforms],
  );
  const genreLine = useMemo(
    () =>
      (game.genres ?? [])
        .map((genre) => genre?.name)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3)
        .join(' • '),
    [game.genres],
  );
  const heroFacts = useMemo(
    () =>
      [
        genreLine ? { label: 'Genres', value: genreLine } : null,
        platformLine ? { label: 'Platforms', value: platformLine } : null,
        game.developer ? { label: 'Studio', value: game.developer } : null,
        releaseLine ? { label: 'Released', value: releaseLine } : null,
      ].filter((fact): fact is { label: string; value: string } => Boolean(fact)),
    [genreLine, platformLine, game.developer, releaseLine],
  );
  const quickMetrics = useMemo(
    () => {
      const metrics: Array<{ key: string; label: string; value: string; suffix?: string; meta?: string }> =
        [];
      const igdbScore =
        typeof game.rating === 'number' && !Number.isNaN(game.rating)
          ? Math.round(game.rating).toString()
          : '—';
      metrics.push({
        key: 'igdb',
        label: 'IGDB score',
        value: igdbScore,
        suffix: igdbScore === '—' ? undefined : '/100',
        meta: 'Critic aggregate',
      });
      metrics.push({
        key: 'community',
        label: 'Community rating',
        value: communityAverageValue ?? '—',
        suffix: communityAverageValue ? '/10' : undefined,
        meta: communityAverageValue ? reviewCountLabel : 'No reviews yet',
      });
      if (game.releaseYear) {
        metrics.push({
          key: 'year',
          label: 'Release year',
          value: game.releaseYear.toString(),
        });
      }
      return metrics;
    },
    [game.rating, communityAverageValue, reviewCountLabel, game.releaseYear],
  );
  const personalReviewCount =
    typeof userReviewCount === 'number' && !Number.isNaN(userReviewCount)
      ? Math.max(0, userReviewCount)
      : 0;

  const replySubmittingSet = useMemo(() => new Set(replySubmittingIds ?? []), [replySubmittingIds]);
  const replyUpdatingSet = useMemo(() => new Set(replyUpdatingIds ?? []), [replyUpdatingIds]);
  const replyDeletingSet = useMemo(() => new Set(replyDeletingIds ?? []), [replyDeletingIds]);
  const editingRepliesSet = useMemo(() => new Set(editingReplies), [editingReplies]);
  const ratingOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), []);

  const visibleCommunityReviews = useMemo(() => {
    const totalAvailable = reviews.length;
    if (!totalAvailable) return [];
    const resolvedCount = Math.min(visibleCommunityCount, totalAvailable);
    return reviews.slice(0, resolvedCount);
  }, [reviews, visibleCommunityCount]);

  const remainingCommunityReviews = Math.max(0, reviews.length - visibleCommunityReviews.length);
  const hasMoreCommunityReviews = remainingCommunityReviews > 0;

  const handleReplyDraftChange = useCallback((reviewId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: text }));
    setReplyErrors((prev) => ({ ...prev, [reviewId]: null }));
  }, []);

  const handleSelectRating = useCallback((value: number) => {
    setRatingInput(value);
    setFormError(null);
  }, []);

  const handleClearRating = useCallback(() => {
    setRatingInput(null);
    setFormError(null);
  }, []);

  const handleToggleReplies = useCallback((reviewId: string, total: number) => {
    const initialVisible = getInitialVisibleCount(total);
    setExpandedReplies((prev) => {
      const next = { ...prev };
      const isExpanded = Boolean(next[reviewId]);
      if (isExpanded) {
        delete next[reviewId];
        setReplyVisibleCounts((counts) => {
          if (!(reviewId in counts)) return counts;
          const copy = { ...counts };
          delete copy[reviewId];
          return copy;
        });
      } else {
        next[reviewId] = true;
        setReplyVisibleCounts((counts) => {
          const existing = counts[reviewId] ?? 0;
          const nextValue = Math.max(initialVisible, existing);
          if (existing === nextValue) return counts;
          return { ...counts, [reviewId]: nextValue };
        });
      }
      return next;
    });
  }, []);

  const handleLoadMoreReplies = useCallback((reviewId: string, total: number) => {
    setReplyVisibleCounts((prev) => {
      const baseline = prev[reviewId] ?? getInitialVisibleCount(total);
      const current = baseline > 0 ? baseline : getInitialVisibleCount(total);
      const nextCount = Math.min(total, current + REPLY_LOAD_INCREMENT);
      if (prev[reviewId] === nextCount) {
        return prev;
      }
      return { ...prev, [reviewId]: nextCount };
    });
  }, []);

  const handleReplySubmit = useCallback(
    async (reviewId: string) => {
      if (!onSubmitReply) return;
      const currentDraft = replyDrafts[reviewId] ?? '';
      const trimmed = currentDraft.trim();
      if (trimmed.length < 2) {
        setReplyErrors((prev) => ({
          ...prev,
          [reviewId]: 'Reply must be at least 2 characters.',
        }));
        return;
      }
      setReplyErrors((prev) => ({ ...prev, [reviewId]: null }));
      try {
        await onSubmitReply(reviewId, { body: trimmed });
        setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
        setReplySuccess((prev) => ({ ...prev, [reviewId]: 'Reply posted!' }));
        setExpandedReplies((prev) => (prev[reviewId] ? prev : { ...prev, [reviewId]: true }));
        const predictedTotal =
          (reviews.find((candidate) => candidate.id === reviewId)?.replies?.length ?? 0) + 1;
        setReplyVisibleCounts((prev) => {
          const minVisible = getInitialVisibleCount(predictedTotal);
          const previous = prev[reviewId] ?? minVisible;
          const resolved =
            predictedTotal > 0
              ? Math.min(predictedTotal, Math.max(previous, minVisible, predictedTotal))
              : 0;
          if (prev[reviewId] === resolved) {
            return prev;
          }
          return { ...prev, [reviewId]: resolved };
        });
        setTimeout(() => {
          setReplySuccess((prev) => {
            if (!prev[reviewId]) return prev;
            const next = { ...prev };
            delete next[reviewId];
            return next;
          });
        }, 2000);
      } catch (error) {
        if (error instanceof Error) {
          setReplyErrors((prev) => ({ ...prev, [reviewId]: error.message }));
        } else {
          setReplyErrors((prev) => ({
            ...prev,
            [reviewId]: 'Unable to post reply right now.',
          }));
        }
      }
    },
    [onSubmitReply, replyDrafts, reviews],
  );

  const handleLoadMoreCommunityReviews = useCallback(() => {
    setVisibleCommunityCount((prev) => prev + COMMUNITY_LOAD_INCREMENT);
  }, []);

  const handleStartReplyEdit = useCallback(
    (reviewId: string, replyId: string, body: string) => {
      const target = reviews.find((review) => review.id === reviewId);
      const totalReplies = target?.replies?.length ?? 0;
      setExpandedReplies((prev) => (prev[reviewId] ? prev : { ...prev, [reviewId]: true }));
      setReplyVisibleCounts((prev) => {
        if (totalReplies <= 0) return prev;
        const desired = Math.max(prev[reviewId] ?? getInitialVisibleCount(totalReplies), totalReplies);
        if (prev[reviewId] === desired) return prev;
        return { ...prev, [reviewId]: desired };
      });
      setEditingReplies((prev) => (prev.includes(replyId) ? prev : [...prev, replyId]));
      setReplyEditDrafts((prev) => ({ ...prev, [replyId]: body }));
      setReplyEditErrors((prev) => ({ ...prev, [replyId]: null }));
      setReplyEditSuccess((prev) => ({ ...prev, [replyId]: null }));
    },
    [reviews],
  );

  const handleReplyEditChange = useCallback((replyId: string, text: string) => {
    setReplyEditDrafts((prev) => ({ ...prev, [replyId]: text }));
    setReplyEditErrors((prev) => ({ ...prev, [replyId]: null }));
  }, []);

  const handleCancelReplyEdit = useCallback((replyId: string) => {
    setEditingReplies((prev) => prev.filter((id) => id !== replyId));
    setReplyEditDrafts((prev) => {
      const next = { ...prev };
      delete next[replyId];
      return next;
    });
    setReplyEditErrors((prev) => {
      const next = { ...prev };
      delete next[replyId];
      return next;
    });
    setReplyEditSuccess((prev) => {
      const next = { ...prev };
      delete next[replyId];
      return next;
    });
  }, []);

  const handleSubmitReplyEdit = useCallback(
    async (reviewId: string, replyId: string) => {
      if (!onUpdateReply) return;
      const current = replyEditDrafts[replyId] ?? '';
      const trimmed = current.trim();
      if (trimmed.length < 2) {
        setReplyEditErrors((prev) => ({
          ...prev,
          [replyId]: 'Reply must be at least 2 characters.',
        }));
        return;
      }
      setReplyEditErrors((prev) => ({ ...prev, [replyId]: null }));
      try {
        await onUpdateReply(reviewId, replyId, { body: trimmed });
        setReplyEditSuccess((prev) => ({ ...prev, [replyId]: 'Reply updated!' }));
        setTimeout(() => {
          setReplyEditSuccess((prev) => {
            if (!prev[replyId]) return prev;
            const next = { ...prev };
            delete next[replyId];
            return next;
          });
        }, 2000);
        setEditingReplies((prev) => prev.filter((id) => id !== replyId));
        setReplyEditDrafts((prev) => {
          const next = { ...prev };
          delete next[replyId];
          return next;
        });
      } catch (error) {
        if (error instanceof Error) {
          setReplyEditErrors((prev) => ({ ...prev, [replyId]: error.message }));
        } else {
          setReplyEditErrors((prev) => ({
            ...prev,
            [replyId]: 'Unable to update reply right now.',
          }));
        }
      }
    },
    [onUpdateReply, replyEditDrafts],
  );

  const handleDeleteReply = useCallback(
    async (reviewId: string, replyId: string) => {
      if (!onDeleteReply) return;
      try {
        await onDeleteReply(reviewId, replyId);
        setReplyDeleteErrors((prev) => {
          const next = { ...prev };
          delete next[replyId];
          return next;
        });
        setEditingReplies((prev) => prev.filter((id) => id !== replyId));
        setReplyEditDrafts((prev) => {
          const next = { ...prev };
          delete next[replyId];
          return next;
        });
      } catch (error) {
        if (error instanceof Error) {
          setReplyDeleteErrors((prev) => ({ ...prev, [replyId]: error.message }));
        } else {
          setReplyDeleteErrors((prev) => ({
            ...prev,
            [replyId]: 'Unable to remove reply right now.',
          }));
        }
      }
    },
    [onDeleteReply],
  );

  const handleConfirmDeleteReply = useCallback(
    (reviewId: string, replyId: string, isOwnReply: boolean) => {
      if (!isOwnReply || !onDeleteReply) return;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          const confirmed = window.confirm('Delete reply? This will remove your comment permanently.');
          if (confirmed) {
            void handleDeleteReply(reviewId, replyId);
          }
        }
        return;
      }
      Alert.alert('Delete reply?', 'This will remove your comment permanently.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteReply(reviewId, replyId);
          },
        },
      ]);
    },
    [handleDeleteReply, onDeleteReply],
  );

  const handleSubmitReview = useCallback(async () => {
    if (!onSubmitReview) return;
    setFormError(null);
    setFormSuccess(null);

    if (ratingInput === null || !Number.isFinite(ratingInput) || ratingInput < 0 || ratingInput > 10) {
      setFormError('Please select a rating between 0 and 10.');
      return;
    }
    const parsedRating = ratingInput;
    const trimmedBody = reviewInput.trim();
    if (trimmedBody.length < 20) {
      setFormError('Please write at least 20 characters.');
      return;
    }

    try {
      await onSubmitReview({ rating: parsedRating, body: trimmedBody });
      setFormSuccess(userReview ? 'Review updated!' : 'Thanks for sharing your thoughts!');
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Unable to submit review right now.');
      }
    }
  }, [onSubmitReview, ratingInput, reviewInput, userReview]);

  const handleFavoritePress = useCallback(() => {
    if (!onToggleFavorite) {
      return;
    }
    onToggleFavorite();
  }, [onToggleFavorite]);

  const reviewCtaDisabled = !canSubmitReview || reviewSubmitting || ratingInput === null;
  const hasTrailer = Boolean(game.mediaUrl);

  const handleWatchTrailer = useCallback(() => {
    if (!hasTrailer || !game.mediaUrl) {
      return;
    }
    Linking.openURL(game.mediaUrl).catch((err) => console.warn('Failed to open trailer', err));
  }, [hasTrailer, game.mediaUrl]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.heroShell}>
        {heroBackdrop ? <Image source={{ uri: heroBackdrop }} style={styles.heroBackdrop} /> : null}
        <View style={styles.heroGradient} />
        <View style={[styles.heroRow, isWide && styles.heroRowWide]}>
          <View style={styles.heroTextColumn}>
            <Text style={styles.heroEyebrow}>
              {releaseLine ?? 'Upcoming release'}
              {game.developer ? ` • ${game.developer}` : ''}
            </Text>
            <Text style={styles.title}>{game.name}</Text>
            {heroBlurb ? <Text style={styles.heroSummary}>{heroBlurb}</Text> : null}

            {heroFacts.length ? (
              <View style={styles.heroFactsRow}>
                {heroFacts.map((fact) => (
                  <View key={fact.label} style={styles.heroFactCard}>
                    <Text style={styles.heroFactLabel}>{fact.label}</Text>
                    <Text style={styles.heroFactValue}>{fact.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.heroActionsRow}>
              <Pressable
                onPress={handleWatchTrailer}
                disabled={!hasTrailer}
                style={({ pressed }) => [
                  styles.heroPrimaryButton,
                  pressed && styles.heroPrimaryButtonPressed,
                  !hasTrailer && styles.heroActionDisabled,
                ]}
                accessibilityRole="button"
              >
                <Ionicons name="play" size={16} color="#0f172a" />
                <Text style={styles.heroPrimaryButtonLabel}>
                  {hasTrailer ? 'Watch trailer' : 'Trailer unavailable'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleFavoritePress}
                style={({ pressed }) => [
                  styles.heroSecondaryButton,
                  isFavorite && styles.heroSecondaryButtonActive,
                  (favoriteDisabled || pressed) && styles.heroSecondaryButtonPressed,
                ]}
                accessibilityRole="button"
                disabled={favoriteDisabled}
              >
                {favoriteDisabled ? (
                  <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                  <>
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={16}
                      color="#f8fafc"
                    />
                    <Text style={styles.heroSecondaryButtonLabel}>
                      {isFavorite ? 'Favourited' : 'Add to list'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
            {favoriteError ? <Text style={styles.favoriteError}>{favoriteError}</Text> : null}
          </View>

          <View style={styles.heroPosterCard}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.heroPosterImage} />
            ) : (
              <View style={styles.heroPosterFallback}>
                <Text style={styles.heroPosterFallbackText}>No artwork</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.detailSurface}>
        {quickMetrics.length ? (
          <View style={styles.metricRow}>
            {quickMetrics.map((metric) => (
              <View key={metric.key} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  {metric.suffix ? <Text style={styles.metricSuffix}>{metric.suffix}</Text> : null}
                </View>
                {metric.meta ? <Text style={styles.metricMeta}>{metric.meta}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {showcaseUri ? (
          <View style={styles.mediaGallery}>
            <View style={styles.mediaCard}>
              <Image source={{ uri: showcaseUri }} style={styles.mediaImage} />
            </View>
          </View>
        ) : null}

        <View style={[styles.overviewRow, !isWide && styles.overviewColumn]}>
          <View style={styles.descriptionCard}>
            <Text style={styles.cardHeading}>Overview</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          <View style={styles.ratingCard}>
            <Text style={styles.cardHeading}>Community rating</Text>
            <View style={styles.communityRatingBlock}>
              {canShowAverage ? (
                <>
                  <Text style={styles.communityRatingValue}>{communityAverage.toFixed(1)}/10</Text>
                  <Text style={styles.communityRatingMeta}>{reviewCountLabel}</Text>
                </>
              ) : (
                <Text style={styles.communityRatingPlaceholder}>No reviews yet</Text>
              )}
              {reviewLimit ? (
                <Text style={styles.communityRatingMeta}>
                  {reviewLimit} reviews per user available right now.
                </Text>
              ) : null}
            </View>
            {platforms.length > 0 && (
              <View style={styles.platformRow}>
                {platforms.map((platform) => (
                  <View key={platform.id} style={styles.platformPill}>
                    <Text style={styles.platformText}>{platform.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.adCard}>
          {game.bannerUrl ? (
            <Image
              source={{ uri: resolveCoverUri(game.bannerUrl) ?? game.bannerUrl }}
              style={styles.adImage}
            />
          ) : (
            <View style={styles.adPlaceholder}>
              <Text style={styles.adTitle}>Ad Banner</Text>
              <Text style={styles.adSubtitle}>Promote your upcoming release here.</Text>
            </View>
          )}
        </View>

        {!isAuthenticated && (
          <View style={styles.authPrompt}>
            <Text style={styles.authHeading}>Join Playlog</Text>
            <Text style={styles.authCopy}>
              Create an account to favourite games, rate them, and leave community reviews.
            </Text>
            <View style={styles.authActions}>
              <Pressable
                onPress={onSignUp}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnLabel}>Sign up</Text>
              </Pressable>
              <Pressable
                onPress={onSignIn}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnLabel}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.sectionTitle}>Leave a review</Text>
          <Text style={styles.sectionSubtitleText}>
            Share your thoughts about {game.name} and help the community discover great games.
          </Text>
        </View>

        <View style={styles.reviewForm}>
          <Text style={styles.reviewFormTitle}>
            {userReview ? 'Update your review' : 'Leave a review'}
          </Text>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          {formSuccess ? <Text style={styles.formSuccess}>{formSuccess}</Text> : null}
          {!isAuthenticated ? (
            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [
                styles.signInPromptBtn,
                pressed && styles.signInPromptBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.signInPromptLabel}>Sign in to leave a review</Text>
            </Pressable>
          ) : reviewLimitReached && !userReview ? (
            <Text style={styles.limitNotice}>
              You have reached your review limit across games. Update an existing review to share a
              new one.
            </Text>
          ) : (
            <>
              <View style={styles.ratingInputRow}>
                <Text style={styles.ratingInputLabel}>Your rating (0-10)</Text>
                <View style={styles.ratingStarsRow}>
                  {ratingOptions.map((value) => {
                    const isActive = ratingInput !== null && value <= ratingInput;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => handleSelectRating(value)}
                        style={({ pressed }) => [
                          styles.ratingStarButton,
                          pressed && styles.ratingStarButtonPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Set rating to ${value}`}
                      >
                        <Ionicons
                          name={isActive ? 'star' : 'star-outline'}
                          size={22}
                          color={isActive ? '#fbbf24' : '#475569'}
                        />
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.ratingMetaRow}>
                  <Text style={styles.ratingSelectedValue}>
                    {ratingInput !== null ? `${ratingInput}/10` : 'Tap a star to rate'}
                  </Text>
                  {ratingInput !== null ? (
                    <Pressable
                      onPress={handleClearRating}
                      style={({ pressed }) => [
                        styles.ratingClearButton,
                        pressed && styles.ratingClearButtonPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.ratingClearLabel}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <TextInput
                value={reviewInput}
                onChangeText={setReviewInput}
                placeholder={REVIEW_PLACEHOLDER}
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.reviewTextarea}
              />
              <Pressable
                onPress={handleSubmitReview}
                disabled={reviewCtaDisabled}
                style={({ pressed }) => [
                  styles.submitBtn,
                  reviewCtaDisabled && styles.submitBtnDisabled,
                  pressed && !reviewCtaDisabled && styles.submitBtnPressed,
                ]}
                accessibilityRole="button"
              >
                {reviewSubmitting ? (
                  <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                  <Text style={styles.submitBtnLabel}>
                    {userReview ? 'Update review' : 'Share review'}
                  </Text>
                )}
              </Pressable>
            </>
          )}
          {reviewLimit && (
            <Text style={styles.reviewLimitHelper}>
              {Math.min(personalReviewCount, reviewLimit)}/{reviewLimit} personal review slots used.
            </Text>
          )}
        </View>

        <View style={styles.reviewSectionHeader}>
          <Text style={styles.sectionTitle}>Community reviews</Text>
          <Text style={styles.sectionSubtitleText}>
            See what other players are saying. Explore the latest notes first.
          </Text>
        </View>

        {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
        {reviewsLoading ? (
          <View style={styles.reviewLoading}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : visibleCommunityReviews.length ? (
          visibleCommunityReviews.map((review, index) => {
            const isLastReview = index === visibleCommunityReviews.length - 1;
            const replyDraft = replyDrafts[review.id] ?? '';
            const replyError = replyErrors[review.id] ?? null;
            const replySuccessMessage = replySuccess[review.id] ?? null;
            const isReplySubmitting = replySubmittingSet.has(review.id);
            const replies = review.replies ?? [];
            const replyReady = replyDraft.trim().length > 0;
            const totalReplies = replies.length;
            const isRepliesExpanded = expandedReplies[review.id] ?? false;
            const resolvedVisible =
              replyVisibleCounts[review.id] ??
              (isRepliesExpanded ? getInitialVisibleCount(totalReplies) : 0);
            const visibleReplies = isRepliesExpanded
              ? replies.slice(Math.max(0, totalReplies - resolvedVisible))
              : [];
            const remainingReplies = Math.max(0, totalReplies - resolvedVisible);
            return (
              <View
                key={review.id}
                style={[
                  styles.reviewThreadItem,
                  !isLastReview && styles.reviewThreadItemSpaced,
                ]}
              >
                <View style={styles.reviewTimeline}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewInitial}>{review.author.charAt(0).toUpperCase()}</Text>
                  </View>
                  {!isLastReview ? <View style={styles.reviewConnector} /> : null}
                </View>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text style={styles.reviewRating}>{review.rating.toFixed(1)}/10</Text>
                  </View>
                  {review.createdAt ? (
                    <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
                  ) : null}
                  <Text style={styles.reviewBody}>{review.body}</Text>
                  {totalReplies > 0 ? (
                    <View style={styles.replyToggleRow}>
                      {!isRepliesExpanded ? (
                        <Pressable
                          onPress={() => handleToggleReplies(review.id, totalReplies)}
                          style={({ pressed }) => [
                            styles.replyToggleButton,
                            pressed && styles.replyToggleButtonPressed,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.replyToggleLabel}>
                            View replies ({totalReplies})
                          </Text>
                        </Pressable>
                      ) : (
                        <>
                          <Pressable
                            onPress={() => handleToggleReplies(review.id, totalReplies)}
                            style={({ pressed }) => [
                              styles.replyToggleButton,
                              pressed && styles.replyToggleButtonPressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <Text style={styles.replyToggleLabel}>Hide replies</Text>
                          </Pressable>
                          {remainingReplies > 0 ? (
                            <Pressable
                              onPress={() => handleLoadMoreReplies(review.id, totalReplies)}
                              style={({ pressed }) => [
                                styles.replyToggleSecondaryButton,
                                pressed && styles.replyToggleSecondaryButtonPressed,
                              ]}
                              accessibilityRole="button"
                            >
                              <Text style={styles.replyToggleSecondaryLabel}>
                                See more replies (+{remainingReplies})
                              </Text>
                            </Pressable>
                          ) : null}
                        </>
                      )}
                    </View>
                  ) : null}
                  {isRepliesExpanded && visibleReplies.length > 0 && (
                    <View style={styles.replyList}>
                      {visibleReplies.map((reply) => {
                        const isOwnReply = currentUserId ? reply.userId === currentUserId : false;
                        const isEditing = editingRepliesSet.has(reply.id);
                        const editDraft = replyEditDrafts[reply.id] ?? reply.body;
                        const editError = replyEditErrors[reply.id] ?? null;
                        const editSuccessMessage = replyEditSuccess[reply.id] ?? null;
                        const deleteError = replyDeleteErrors[reply.id] ?? null;
                        const isUpdating = replyUpdatingSet.has(reply.id);
                        const isDeleting = replyDeletingSet.has(reply.id);
                        const showActions = isOwnReply && (onUpdateReply || onDeleteReply);

                        return (
                          <View key={reply.id} style={styles.replyItem}>
                            <View style={styles.replyAvatar}>
                              <Text style={styles.replyInitial}>
                                {reply.author.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.replyContent}>
                              <View style={styles.replyHeader}>
                                <Text style={styles.replyAuthor}>{reply.author}</Text>
                                {reply.createdAt ? (
                                  <Text style={styles.replyDate}>
                                    {formatReviewDate(reply.createdAt)}
                                  </Text>
                                ) : null}
                              </View>
                              {isEditing ? (
                                <View style={styles.replyEditBlock}>
                                  <TextInput
                                    value={editDraft}
                                    onChangeText={(text) => handleReplyEditChange(reply.id, text)}
                                    placeholder="Update your reply..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={styles.replyInput}
                                  />
                                  {editError ? (
                                    <Text style={styles.replyErrorText}>{editError}</Text>
                                  ) : null}
                                  {editSuccessMessage ? (
                                    <Text style={styles.replySuccessText}>
                                      {editSuccessMessage}
                                    </Text>
                                  ) : null}
                                  <View style={styles.replyEditActions}>
                                    <Pressable
                                      onPress={() => handleCancelReplyEdit(reply.id)}
                                      style={({ pressed }) => [
                                        styles.replyCancelButton,
                                        pressed && styles.replyCancelButtonPressed,
                                      ]}
                                      accessibilityRole="button"
                                      disabled={isUpdating}
                                    >
                                      <Text style={styles.replyCancelLabel}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => handleSubmitReplyEdit(review.id, reply.id)}
                                      disabled={isUpdating}
                                      style={({ pressed }) => [
                                        styles.replySaveButton,
                                        isUpdating && styles.replyButtonDisabled,
                                        pressed &&
                                          !isUpdating &&
                                          styles.replySaveButtonPressed,
                                      ]}
                                      accessibilityRole="button"
                                    >
                                      {isUpdating ? (
                                        <ActivityIndicator size="small" color="#f8fafc" />
                                      ) : (
                                        <Text style={styles.replySaveLabel}>Save</Text>
                                      )}
                                    </Pressable>
                                  </View>
                                </View>
                              ) : (
                                <Text style={styles.replyBody}>{reply.body}</Text>
                              )}
                              {deleteError ? (
                                <Text style={styles.replyErrorText}>{deleteError}</Text>
                              ) : null}
                              {showActions ? (
                                <View style={styles.replyActions}>
                                  {isEditing ? null : onUpdateReply ? (
                                    <Pressable
                                      onPress={() =>
                                        handleStartReplyEdit(review.id, reply.id, reply.body)
                                      }
                                      style={({ pressed }) => [
                                        styles.replyActionButton,
                                        pressed && styles.replyActionButtonPressed,
                                      ]}
                                      accessibilityRole="button"
                                    >
                                      <Text style={styles.replyActionLabel}>Edit</Text>
                                    </Pressable>
                                  ) : null}
                                  {onDeleteReply ? (
                                    <Pressable
                                      onPress={() =>
                                        handleConfirmDeleteReply(review.id, reply.id, isOwnReply)
                                      }
                                      disabled={isDeleting}
                                      style={({ pressed }) => [
                                        styles.replyDeleteButton,
                                        pressed && styles.replyDeleteButtonPressed,
                                      ]}
                                      accessibilityRole="button"
                                    >
                                      {isDeleting ? (
                                        <ActivityIndicator size="small" color="#f8fafc" />
                                      ) : (
                                        <Text style={styles.replyDeleteLabel}>Delete</Text>
                                      )}
                                    </Pressable>
                                  ) : null}
                                </View>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.replyComposer}>
                    {isAuthenticated ? (
                      <>
                        <TextInput
                          value={replyDraft}
                          onChangeText={(text) => handleReplyDraftChange(review.id, text)}
                          placeholder="Share your thoughts..."
                          placeholderTextColor="#64748b"
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          style={styles.replyInput}
                        />
                        {replyError ? <Text style={styles.replyErrorText}>{replyError}</Text> : null}
                        {replySuccessMessage ? (
                          <Text style={styles.replySuccessText}>{replySuccessMessage}</Text>
                        ) : null}
                        <Pressable
                          onPress={() => handleReplySubmit(review.id)}
                          disabled={!replyReady || isReplySubmitting}
                          style={({ pressed }) => [
                            styles.replyButton,
                            (!replyReady || isReplySubmitting) && styles.replyButtonDisabled,
                            pressed && replyReady && !isReplySubmitting && styles.replyButtonPressed,
                          ]}
                          accessibilityRole="button"
                        >
                          {isReplySubmitting ? (
                            <ActivityIndicator size="small" color="#f8fafc" />
                          ) : (
                            <Text style={styles.replyButtonLabel}>Reply</Text>
                          )}
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        onPress={onSignIn}
                        style={({ pressed }) => [
                          styles.replySigninButton,
                          pressed && styles.replySigninButtonPressed,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.replySigninLabel}>Sign in to reply</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyState}>No reviews yet. Be the first to share your thoughts.</Text>
        )}

        {hasMoreCommunityReviews ? (
          <Pressable
            onPress={handleLoadMoreCommunityReviews}
            style={({ pressed }) => [
              styles.communityLoadMoreButton,
              pressed && styles.communityLoadMoreButtonPressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.communityLoadMoreLabel}>
              See more reviews (+{remainingCommunityReviews})
            </Text>
          </Pressable>
        ) : null}
      </View>

      {similarGames.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Similar games</Text>
          <FlatList
            data={similarGames}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.similarListContent}
            ItemSeparatorComponent={() => <View style={styles.similarSeparator} />}
            renderItem={({ item }) => (
              <GameCard
                game={item}
                containerStyle={styles.similarCard}
                onPress={onSelectSimilar ? () => onSelectSimilar(item) : undefined}
              />
            )}
          />
        </View>
      )}
    </ScrollView>
  );
}

function resolveCoverUri(raw?: string | null) {
  if (!raw) return undefined;
  const normalized = raw.replace('t_thumb', 't_cover_big');
  return normalized.startsWith('http') ? normalized : `https:${normalized}`;
}

function buildReleaseLine(game: GameDetailsData) {
  const year =
    game.releaseYear ??
    (game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined);
  const developer = game.developer;

  if (year && developer) return `${year}, ${developer}`;
  if (year) return `${year}`;
  if (developer) return developer;
  return null;
}

function formatPlatform(slug?: string | null) {
  if (!slug) return 'Unknown';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatReviewDate(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 32,
    backgroundColor: '#0f172a',
  },
  heroShell: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    position: 'relative',
    shadowColor: '#01030a',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 11, 25, 0.85)',
  },
  heroRow: {
    gap: 24,
    padding: 24,
    position: 'relative',
  },
  heroRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroTextColumn: {
    flex: 1,
    gap: 12,
  },
  heroEyebrow: {
    color: '#94a3b8',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroSummary: {
    color: '#cbd5f5',
    fontSize: 14,
    lineHeight: 20,
  },
  heroFactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroFactCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  heroFactLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroFactValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  heroPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#4ade80',
  },
  heroPrimaryButtonPressed: {
    opacity: 0.85,
  },
  heroPrimaryButtonLabel: {
    color: '#0f172a',
    fontWeight: '700',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  heroSecondaryButtonPressed: {
    opacity: 0.75,
  },
  heroSecondaryButtonActive: {
    borderColor: '#f8fafc',
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
  },
  heroSecondaryButtonLabel: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  heroActionDisabled: {
    opacity: 0.5,
  },
  favoriteError: {
    color: '#fca5a5',
    fontSize: 13,
  },
  heroPosterCard: {
    width: 140,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  heroPosterImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  heroPosterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  heroPosterFallbackText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 18,
    backgroundColor: 'rgba(8, 13, 28, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    padding: 16,
    gap: 4,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
  },
  metricSuffix: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  metricMeta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  detailSurface: {
    gap: 24,
    borderRadius: 28,
    padding: 24,
    backgroundColor: 'rgba(4, 7, 18, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  mediaGallery: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  mediaCard: {
    width: '100%',
    backgroundColor: '#0b1120',
  },
  mediaImage: {
    width: '100%',
    height: 220,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 16,
  },
  overviewColumn: {
    flexDirection: 'column',
  },
  descriptionCard: {
    flex: 2,
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  ratingCard: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5f5',
    letterSpacing: 1,
  },
  descriptionText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  communityRatingBlock: {
    gap: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  communityRatingValue: {
    color: '#a5b4fc',
    fontSize: 18,
    fontWeight: '700',
  },
  communityRatingMeta: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  communityRatingPlaceholder: {
    color: '#94a3b8',
    fontSize: 13,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  platformText: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '600',
  },
  adCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    backgroundColor: '#111827',
    minHeight: 160,
  },
  adImage: {
    width: '100%',
    height: 160,
  },
  adPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  adSubtitle: {
    color: '#94a3b8',
    textAlign: 'center',
  },
  authPrompt: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  authHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  authCopy: {
    fontSize: 14,
    color: '#cbd5f5',
  },
  authActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  primaryBtnPressed: {
    backgroundColor: '#4f46e5',
  },
  primaryBtnLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  secondaryBtnPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  secondaryBtnLabel: {
    color: '#cbd5f5',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 16,
  },
  reviewSectionHeader: {
    gap: 4,
  },
  sectionSubtitleText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  reviewLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  reviewThreadItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  reviewThreadItemSpaced: {
    marginBottom: 20,
  },
  reviewTimeline: {
    alignItems: 'center',
    minWidth: 40,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewConnector: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
    marginTop: 6,
  },
  reviewInitial: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
  reviewCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 15,
  },
  reviewRating: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: -2,
  },
  reviewBody: {
    color: '#e2e8f0',
    lineHeight: 20,
    marginTop: 4,
  },
  replyList: {
    marginTop: 16,
    gap: 14,
  },
  replyToggleRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  replyToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  replyToggleButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  replyToggleLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '600',
  },
  replyToggleSecondaryButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  replyToggleSecondaryButtonPressed: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
  },
  replyToggleSecondaryLabel: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '600',
  },
  communityLoadMoreButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  communityLoadMoreButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.32)',
  },
  communityLoadMoreLabel: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '600',
  },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyInitial: {
    color: '#cbd5f5',
    fontWeight: '700',
    fontSize: 13,
  },
  replyContent: {
    flex: 1,
    gap: 4,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  replyAuthor: {
    color: '#f1f5f9',
    fontWeight: '600',
    fontSize: 14,
  },
  replyDate: {
    color: '#94a3b8',
    fontSize: 11,
  },
  replyBody: {
    color: '#cbd5f5',
    fontSize: 13,
    lineHeight: 18,
  },
  replyComposer: {
    marginTop: 16,
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    padding: 12,
  },
  replyInput: {
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 18,
  },
  replyErrorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  replySuccessText: {
    color: '#86efac',
    fontSize: 12,
  },
  replyEditBlock: {
    marginTop: 8,
    gap: 8,
  },
  replyEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  replyCancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  replyCancelButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  replyCancelLabel: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
  },
  replySaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  replySaveButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  replySaveLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  replyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  replyActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  replyActionButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  replyActionLabel: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '600',
  },
  replyDeleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  replyDeleteButtonPressed: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  replyDeleteLabel: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  replyButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  replyButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
  },
  replyButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  replyButtonLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  replySigninButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignSelf: 'flex-start',
  },
  replySigninButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  replySigninLabel: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    color: '#94a3b8',
    fontSize: 14,
  },
  reviewForm: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  reviewFormTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  formError: {
    color: '#fca5a5',
    fontSize: 13,
  },
  formSuccess: {
    color: '#86efac',
    fontSize: 13,
  },
  ratingInputRow: {
    gap: 8,
  },
  ratingInputLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ratingStarButton: {
    padding: 4,
    borderRadius: 999,
  },
  ratingStarButtonPressed: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
  },
  ratingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingSelectedValue: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingClearButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  ratingClearButtonPressed: {
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  ratingClearLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewTextarea: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 120,
  },
  submitBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  submitBtnPressed: {
    backgroundColor: '#4f46e5',
  },
  submitBtnDisabled: {
    backgroundColor: '#4b5563',
  },
  submitBtnLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewLimitHelper: {
    color: '#94a3b8',
    fontSize: 12,
  },
  limitNotice: {
    color: '#fbbf24',
    fontSize: 14,
  },
  signInPromptBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  signInPromptBtnPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  signInPromptLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  similarListContent: {
    paddingVertical: 8,
  },
  similarSeparator: {
    width: 16,
  },
  similarCard: {
    width: 220,
  },
});
