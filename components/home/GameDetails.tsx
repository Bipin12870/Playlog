import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
};

const REVIEW_PLACEHOLDER = 'Share what stood out to you about this game (at least 20 characters).';

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
}: GameDetailsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const coverUri = resolveCoverUri(game.cover?.url ?? null);
  const showcaseUri = resolveCoverUri(game.mediaUrl ?? null) ?? coverUri;
  const ratingDisplay = game.ratingLabel ?? buildRatingLabel(game.rating);
  const releaseLine = buildReleaseLine(game);
  const description = game.description ?? game.summary ?? 'No description available.';

  const [ratingInput, setRatingInput] = useState(userReview?.rating ? String(userReview.rating) : '');
  const [reviewInput, setReviewInput] = useState(userReview?.body ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRatingInput(userReview?.rating ? String(userReview.rating) : '');
    setReviewInput(userReview?.body ?? '');
  }, [userReview?.id, userReview?.rating, userReview?.body]);

  useEffect(() => {
    if (!reviewSubmitting && formSuccess) {
      const timeout = setTimeout(() => setFormSuccess(null), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [reviewSubmitting, formSuccess]);

  const platforms = useMemo(
    () => game.platforms?.slice(0, 6).map((platform, index) => ({
        id: `${platform.slug ?? platform.abbreviation ?? index}`,
        label: platform.abbreviation ?? formatPlatform(platform.slug),
      })) ?? [],
    [game.platforms],
  );

  const reviewCountLabel = communityReviewCount === 1 ? '1 review' : `${communityReviewCount} reviews`;
  const canShowAverage = typeof communityAverage === 'number' && !Number.isNaN(communityAverage);
  const personalReviewCount =
    typeof userReviewCount === 'number' && !Number.isNaN(userReviewCount)
      ? Math.max(0, userReviewCount)
      : 0;

  const handleSubmitReview = useCallback(async () => {
    if (!onSubmitReview) return;
    setFormError(null);
    setFormSuccess(null);

    const parsedRating = Number(ratingInput);
    if (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 10) {
      setFormError('Rating must be between 0 and 10.');
      return;
    }
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

  const reviewCtaDisabled = !canSubmitReview || reviewSubmitting;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.heroRow, isWide && styles.heroRowWide]}>
        <View style={styles.mediaColumn}>
          <View style={styles.coverCard}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverFallback}>
                <Text style={styles.coverFallbackText}>No artwork</Text>
              </View>
            )}
          </View>

          <View style={styles.showcaseCard}>
            {showcaseUri ? (
              <Image source={{ uri: showcaseUri }} style={styles.showcaseImage} />
            ) : (
              <View style={styles.showcaseFallback}>
                <Ionicons name="image-outline" size={24} color="#d1d5db" />
                <Text style={styles.showcaseFallbackText}>Gameplay media</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsColumn}>
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>{game.name}</Text>
              {releaseLine ? <Text style={styles.subtitle}>{releaseLine}</Text> : null}
            </View>
            <Pressable
              onPress={handleFavoritePress}
              style={({ pressed }) => [
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
                (favoriteDisabled || pressed) && styles.favoriteButtonPressed,
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
                    size={18}
                    color="#f8fafc"
                  />
                  <Text style={styles.favoriteButtonLabel}>
                    {isFavorite ? 'Favourited' : 'Add to favourites'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
          {favoriteError ? <Text style={styles.favoriteError}>{favoriteError}</Text> : null}

          <View style={[styles.overviewRow, !isWide && styles.overviewColumn]}>
            <View style={styles.descriptionCard}>
              <Text style={styles.cardHeading}>Overview</Text>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>

            <View style={styles.ratingCard}>
              <Text style={styles.cardHeading}>Ratings</Text>
              {ratingDisplay ? (
                <Text style={styles.ratingValue}>{ratingDisplay}</Text>
              ) : (
                <Text style={styles.ratingPlaceholder}>Rating unavailable</Text>
              )}

              <View style={styles.communityRatingBlock}>
                <Text style={styles.communityRatingLabel}>Community rating</Text>
                {canShowAverage ? (
                  <>
                    <Text style={styles.communityRatingValue}>
                      {communityAverage.toFixed(1)}/10
                    </Text>
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
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryBtnLabel}>Sign up</Text>
                </Pressable>
                <Pressable
                  onPress={onSignIn}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && styles.secondaryBtnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryBtnLabel}>Sign in</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community reviews</Text>
        {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
        {reviewsLoading ? (
          <View style={styles.reviewLoading}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : reviews.length ? (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewInitial}>{review.author.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewAuthor}>{review.author}</Text>
                  <Text style={styles.reviewRating}>{review.rating.toFixed(1)}/10</Text>
                  {review.createdAt ? (
                    <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
                  ) : null}
                </View>
              </View>
              <Text style={styles.reviewBody}>{review.body}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyState}>No reviews yet. Be the first to share your thoughts.</Text>
        )}

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
                <TextInput
                  value={ratingInput}
                  onChangeText={setRatingInput}
                  keyboardType="decimal-pad"
                  placeholder="8.5"
                  placeholderTextColor="#6b7280"
                  maxLength={4}
                  style={styles.ratingInput}
                />
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

function buildRatingLabel(rating?: number) {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return null;
  return `${(rating / 10).toFixed(1)}/10 IGDB`;
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
  heroRow: {
    gap: 24,
  },
  heroRowWide: {
    flexDirection: 'row',
  },
  mediaColumn: {
    flex: 0.8,
    gap: 16,
  },
  coverCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  coverImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  coverFallback: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  coverFallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  showcaseCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
    minHeight: 220,
  },
  showcaseFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  showcaseFallbackText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  detailsColumn: {
    flex: 1.2,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5f5',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  favoriteButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  favoriteButtonLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteError: {
    color: '#fca5a5',
    fontSize: 13,
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
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fbbf24',
  },
  ratingPlaceholder: {
    color: '#94a3b8',
    fontSize: 16,
  },
  communityRatingBlock: {
    gap: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  communityRatingLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  reviewCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewInitial: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
  reviewMeta: {
    gap: 2,
  },
  reviewAuthor: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  reviewRating: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  reviewBody: {
    color: '#e2e8f0',
    lineHeight: 20,
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
  ratingInput: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16,
    width: 120,
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
