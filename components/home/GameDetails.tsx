import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '../GameCard';
import { getFriendlyModerationMessage } from '../../lib/errors';
import type { GameDetailsData, GameReview, GameSummary } from '../../types/game';
import type { AffiliateSuggestion } from '../../lib/affiliate';
import { useTheme } from '../../lib/theme';

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
  favoriteLimitReached?: boolean;
  maxFavorites?: number | null;
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
  onBack?: () => void;
  onOpenAffiliate?: () => void;
  affiliateSuggestions?: AffiliateSuggestion[];
};

const REVIEW_PLACEHOLDER = 'Share what stood out to you about this game (at least 20 characters).';
const FAVORITE_ACCENT = '#f472b6';
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
  favoriteLimitReached = false,
  maxFavorites = null,
  onToggleFavorite,
  isFavorite = false,
  currentUserId = null,
  onSubmitReply,
  replySubmittingIds = [],
  onUpdateReply,
  onDeleteReply,
  replyUpdatingIds = [],
  replyDeletingIds = [],
  onBack,
  onOpenAffiliate,
  affiliateSuggestions = [],
}: GameDetailsProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const isWide = width >= 1024;
  const isPhoneLayout = Platform.OS !== 'web' && width < 900;
  const shouldShowNativeBackControls = Platform.OS !== 'web';
  const scrollY = useRef(new Animated.Value(0)).current;

  const rawCoverUrl = game.cover?.url ?? null;
  const rawMediaUrl = game.mediaUrl ?? null;
  const rawBannerUrl = game.bannerUrl ?? null;

  const coverUri = resolveCoverUri(rawCoverUrl);
  const showcaseUri =
    resolveBackdropUri(rawMediaUrl) ?? resolveBackdropUri(rawBannerUrl) ?? coverUri;
  const heroLandscapeUri = showcaseUri ?? coverUri;
  const releaseLine = buildReleaseLine(game);
  const releaseMeta = useMemo(() => {
    if (!releaseLine) return null;
    return releaseLine.replace(/,/g, ' •');
  }, [releaseLine]);
  const description = game.description ?? game.summary ?? 'No description available.';
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
  const [replyComposerOpen, setReplyComposerOpen] = useState<Record<string, boolean>>({});
  const [editingReplies, setEditingReplies] = useState<string[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyVisibleCounts, setReplyVisibleCounts] = useState<Record<string, number>>({});
  const [visibleCommunityCount, setVisibleCommunityCount] = useState(INITIAL_COMMUNITY_PREVIEW_COUNT);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(true); // now unused but left unchanged
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyModalReviewId, setReplyModalReviewId] = useState<string | null>(null);
  const [replyModalSource, setReplyModalSource] = useState<'detail' | 'reviews' | null>(null);
  const [reviewModalMode, setReviewModalMode] = useState<'reviews' | 'replies'>('reviews');
  const [replyModalFromReviews, setReplyModalFromReviews] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const reviewSectionOffset = useRef(0);
  const userReviewSnippet = useMemo(() => {
    const text = userReview?.body?.trim();
    if (!text) return null;
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }, [userReview?.body]);
  const heroScale = useMemo(() => {
    if (!isPhoneLayout) return null;
    return scrollY.interpolate({
      inputRange: [-120, 0, 220],
      outputRange: [1.08, 1, 1.05],
      extrapolate: 'clamp',
    });
  }, [isPhoneLayout, scrollY]);
  const heroTranslateY = useMemo(() => {
    if (!isPhoneLayout) return null;
    return scrollY.interpolate({
      inputRange: [-120, 0, 220],
      outputRange: [-28, 0, 26],
      extrapolate: 'clamp',
    });
  }, [isPhoneLayout, scrollY]);
  const heroCardAnimatedStyle =
    isPhoneLayout && heroScale && heroTranslateY
      ? { transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }
      : undefined;

  const affiliateFallbackUri = resolveCoverUri(game.cover?.url ?? null);

  useEffect(() => {
    setRatingInput(typeof userReview?.rating === 'number' ? userReview.rating : null);
    setReviewInput(userReview?.body ?? '');
  }, [userReview?.id, userReview?.rating, userReview?.body]);

  useEffect(() => {
    if (!reviewSubmitting && formSuccess) {
      if (showRateModal) {
        setShowRateModal(false);
      }
      const timeout = setTimeout(() => setFormSuccess(null), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [reviewSubmitting, formSuccess, showRateModal]);

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
    () =>
      game.platforms?.slice(0, 6).map((platform, index) => ({
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
  const igdbScoreValue = useMemo(() => {
    if (typeof game.rating === 'number' && !Number.isNaN(game.rating)) {
      return Math.round(game.rating);
    }
    return null;
  }, [game.rating]);
  const genreItems = useMemo(
    () =>
      (game.genres ?? [])
        .map((genre) => genre?.name)
        .filter((name): name is string => Boolean(name)),
    [game.genres],
  );
  const heroFactSections = useMemo(() => {
    const sections: Array<{ key: string; label: string; items: string[] }> = [];
    if (genreItems.length) {
      sections.push({
        key: 'genres',
        label: 'Genres',
        items: genreItems,
      });
    }
    const platformItems = platforms.map((platform) => platform.label).filter(Boolean);
    if (platformItems.length) {
      sections.push({
        key: 'platforms',
        label: 'Platforms',
        items: platformItems,
      });
    }
    if (game.developer) {
      sections.push({
        key: 'studio',
        label: 'Studio',
        items: [game.developer],
      });
    }
    if (igdbScoreValue !== null) {
      sections.push({
        key: 'igdb',
        label: 'IGDB score',
        items: [`${igdbScoreValue}/100 • Critic aggregate`],
      });
    }
    return sections;
  }, [genreItems, platforms, game.developer, igdbScoreValue]);
  const [activeFactSection, setActiveFactSection] = useState<string | null>(
    heroFactSections[0]?.key ?? null,
  );
  useEffect(() => {
    setActiveFactSection((prev) => {
      if (!heroFactSections.length) {
        return null;
      }
      if (prev && heroFactSections.some((section) => section.key === prev)) {
        return prev;
      }
      if (prev === null) {
        return null;
      }
      return heroFactSections[0]?.key ?? null;
    });
  }, [heroFactSections]);
  const handleSelectFactSection = useCallback((sectionKey: string) => {
    setActiveFactSection((prev) => (prev === sectionKey ? null : sectionKey));
  }, []);
  const activeFactItems =
    heroFactSections.find((section) => section.key === activeFactSection)?.items ?? [];
  const quickMetrics = useMemo(
    () => {
      const metrics: Array<{ key: string; label: string; value: string; suffix?: string; meta?: string }> =
        [];
      metrics.push({
        key: 'community',
        label: 'Community rating',
        value: communityAverageValue ?? '—',
        suffix: communityAverageValue ? '/10' : undefined,
        meta: communityAverageValue ? reviewCountLabel : 'No reviews yet',
      });
      return metrics;
    },
    [communityAverageValue, reviewCountLabel],
  );
  const personalReviewCount =
    typeof userReviewCount === 'number' && !Number.isNaN(userReviewCount)
      ? Math.max(0, userReviewCount)
      : 0;

  const reviewLimitRemaining = useMemo(() => {
    if (typeof reviewLimit !== 'number' || !Number.isFinite(reviewLimit)) return null;
    return Math.max(0, reviewLimit - personalReviewCount);
  }, [reviewLimit, personalReviewCount]);

  const reviewLimitLabel = useMemo(() => {
    if (reviewLimitRemaining === null) return null;
    const plural = reviewLimitRemaining === 1 ? 'review' : 'reviews';
    return `${reviewLimitRemaining} ${plural} left on free plan`;
  }, [reviewLimitRemaining]);

  const themeStyles = useMemo(
    () => ({
      surfaceCard: { backgroundColor: colors.surface, borderColor: colors.border },
      surfaceAltCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
      factNavBorder: { borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.border },
      factNavLabel: { color: colors.success },
      factNavUnderline: { backgroundColor: colors.success },
      factList: { color: colors.text },
      heroHeadline: { color: colors.text },
      heroEyebrow: { color: colors.muted },
      heroMetricLabel: { color: colors.muted },
      heroMetricValue: { color: colors.text },
      heroMetricSuffix: { color: colors.muted },
      heroMetricMeta: { color: colors.muted },
      sectionTitle: { color: colors.text },
      communityTitle: { color: colors.text },
      sectionSubtitle: { color: colors.muted },
      reviewAuthor: { color: colors.text },
      reviewBody: { color: colors.text },
      reviewDate: { color: colors.muted },
      reviewInitial: { color: colors.text },
      replyToggleLabel: { color: colors.text },
      replyToggleButton: {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : colors.surfaceSecondary,
        borderColor: colors.border,
        borderWidth: 1,
      },
      replyToggleButtonActive: {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : colors.accentSoft,
        borderColor: colors.accent,
      },
      heroOverviewCard: isDark
        ? null
        : {
            backgroundColor: colors.surface,
            shadowColor: colors.border,
            borderColor: colors.border,
            borderWidth: 1,
          },
      heroOverviewCardWide: isDark
        ? null
        : {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
          },
      overviewText: { color: colors.text },
      heroSecondaryButton: {
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : colors.surfaceSecondary,
      },
      heroSecondaryButtonActive: {
        borderColor: '#f472b6',
        backgroundColor: isDark ? 'rgba(248, 250, 252, 0.08)' : colors.accentSoft,
      },
      heroSecondaryButtonLabel: { color: colors.text },
      heroSecondaryButtonLabelActive: { color: '#f472b6' },
      heroMetricsCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
      heroPhoneSecondaryButton: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
      },
      heroPhoneSecondaryActive: {
        borderColor: '#f472b6',
        backgroundColor: isDark ? 'rgba(248, 250, 252, 0.12)' : colors.accentSoft,
      },
      heroPhoneSecondaryLabel: { color: colors.text },
      heroPhoneSecondaryLabelActive: { color: '#f472b6' },
      heroPhoneTitle: { color: colors.text },
      heroPhoneMeta: { color: colors.muted },
      heroPhoneAccordionLabel: { color: colors.text },
      heroTopBarTitle: { color: colors.text },
      affiliateSection: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : colors.surfaceSecondary,
        borderColor: colors.border,
      },
      affiliateTitle: { color: colors.text },
      affiliateSubtitle: { color: colors.subtle },
      affiliateButton: {
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
      },
      affiliateButtonPressed: {
        opacity: 0.8,
      },
      affiliateButtonLabel: { color: colors.text },
      affiliateCard: {
        borderColor: colors.border,
        backgroundColor: colors.surface,
      },
      affiliateCardPressed: {
        opacity: 0.92,
      },
      affiliateCardHover: {
        shadowColor: colors.border,
        shadowOpacity: 0.55,
        shadowRadius: 34,
        elevation: 18,
      },
      affiliateCardLabel: { color: colors.text },
      communityLoadMoreButton: {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : colors.surfaceSecondary,
        borderColor: colors.border,
        borderWidth: 1,
      },
      communityLoadMoreButtonActive: {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.28)' : colors.accentSoft,
      },
      communityLoadMoreLabel: { color: colors.text },
      rateModalSafeArea: { backgroundColor: colors.background },
      rateModalSheet: { backgroundColor: colors.surface, borderColor: colors.border },
      rateModalLabel: { color: colors.text },
      rateModalGameTitle: { color: colors.text },
      rateModalGameMeta: { color: colors.muted },
      rateModalCoverFallbackText: { color: colors.text },
      rateModalTextarea: {
        backgroundColor: colors.surfaceSecondary,
        borderColor: colors.border,
        color: colors.text,
      },
      ratingSelectedValue: { color: colors.text },
      ratingClearButton: {
        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.18)' : colors.surfaceSecondary,
        borderColor: colors.border,
        borderWidth: 1,
      },
      ratingClearButtonActive: {
        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.3)' : colors.accentSoft,
      },
      ratingClearLabel: { color: colors.text },
      ratingStarActive: colors.accent,
      ratingStarInactive: colors.muted,
    }),
    [colors, isDark],
  );

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
  const shouldUseReviewModal = reviews.length > 3;
  const showFormFeedbackInModal = showRateModal;

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
        setReplyComposerOpen((prev) => ({ ...prev, [reviewId]: false }));
      } catch (error) {
        const friendly = getFriendlyModerationMessage(error, 'Unable to post reply right now.');
        setReplyErrors((prev) => ({ ...prev, [reviewId]: friendly }));
      }
    },
    [onSubmitReply, replyDrafts, reviews],
  );

  const handleLoadMoreCommunityReviews = useCallback(() => {
    setVisibleCommunityCount((prev) => prev + COMMUNITY_LOAD_INCREMENT);
  }, []);

  const handleOpenAllReviews = useCallback(() => {
    setShowReplyModal(false);
    setReplyModalReviewId(null);
    setReplyModalSource(null);
    setShowAllReviewsModal(true);
  }, []);

  const handleCloseAllReviews = useCallback(() => {
    setShowReplyModal(false);
    setReplyModalReviewId(null);
    setReplyModalSource(null);
    setShowAllReviewsModal(false);
  }, []);

  const handleOpenReplyComposer = useCallback(
    (reviewId: string, totalReplies: number, fromReviewsList = false) => {
      if (totalReplies > 3) {
        setReplyModalSource(fromReviewsList ? 'reviews' : 'detail');
        setReplyModalReviewId(reviewId);
        setShowReplyModal(true);
        setShowAllReviewsModal(true);
      }
      setReplyComposerOpen((prev) => ({ ...prev, [reviewId]: true }));
      if (totalReplies <= 3) {
        setExpandedReplies((prev) => (prev[reviewId] ? prev : { ...prev, [reviewId]: true }));
        setReplyVisibleCounts((prev) => {
          const baseline = prev[reviewId] ?? getInitialVisibleCount(totalReplies);
          if (prev[reviewId] === baseline) return prev;
          return { ...prev, [reviewId]: baseline };
        });
      }
    },
    [],
  );

  const handleOpenReplyModal = useCallback((reviewId: string, fromReviewsList = false) => {
    setReviewModalMode('replies');
    setReplyModalFromReviews(fromReviewsList);
    setShowAllReviewsModal(true);
    setReplyModalReviewId(reviewId);
  }, []);

  const handleBackToReviewsList = useCallback(() => {
    setShowAllReviewsModal(true);
    setReviewModalMode('reviews');
    setReplyModalFromReviews(false);
    setReplyModalReviewId(null);
  }, []);

  const handleCloseReplyModal = useCallback(() => {
    setShowAllReviewsModal(false);
  }, []);
  const handleReplyArrowCta = useCallback(() => {
    // placeholder for future navigation
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
        const friendly = getFriendlyModerationMessage(error, 'Unable to update reply right now.');
        setReplyEditErrors((prev) => ({ ...prev, [replyId]: friendly }));
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

    if (reviewLimitReached) {
      Alert.alert(
        'Upgrade to premium',
        'Free accounts can share up to 10 reviews. Upgrade to premium to unlock unlimited submissions.',
      );
      return;
    }

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
      setFormError(getFriendlyModerationMessage(error));
    }
  }, [onSubmitReview, ratingInput, reviewInput, userReview]);

  const handleFavoritePress = useCallback(() => {
    if (favoriteDisabled || !onToggleFavorite) {
      return;
    }
    onToggleFavorite();
  }, [favoriteDisabled, onToggleFavorite]);

  const reviewCtaDisabled =
    !canSubmitReview || reviewSubmitting || ratingInput === null || reviewLimitReached;
  const trailerUrl = game.trailerUrl ?? null;
  const hasTrailer = Boolean(trailerUrl);

  const shouldClampOverview = description.length > 320;
  const overviewText = description.trim();
  const overviewNumberOfLines = !isOverviewExpanded && shouldClampOverview ? 4 : undefined;
  const handleToggleOverview = useCallback(() => {
    setIsOverviewExpanded((prev) => !prev);
  }, []);

  const handleWatchTrailer = useCallback(() => {
    if (!hasTrailer || !trailerUrl) {
      return;
    }
    Linking.openURL(trailerUrl).catch((err) => console.warn('Failed to open trailer', err));
  }, [hasTrailer, trailerUrl]);

  const heroHorizontalGradient = isPhoneLayout
    ? ['rgba(4, 7, 18, 0.55)', 'rgba(4, 7, 18, 0)', 'rgba(4, 7, 18, 0.55)']
    : ['rgba(4, 7, 18, 0.9)', 'rgba(4, 7, 18, 0)', 'rgba(4, 7, 18, 0.9)'];
  const heroVerticalGradient = isPhoneLayout
    ? ['rgba(4, 7, 18, 0.6)', 'rgba(4, 7, 18, 0.05)', 'rgba(4, 7, 18, 0.6)']
    : ['rgba(4, 7, 18, 0.85)', 'rgba(4, 7, 18, 0)', 'rgba(4, 7, 18, 0.85)'];
  const phoneInfoStyle = useMemo(() => {
    if (!isPhoneLayout) return undefined;
    const leftMargin = 24;
    const thumbnailWidth = 120;
    const thumbnailMargin = 20;
    const gap = 20;
    const reservedRight = thumbnailWidth + thumbnailMargin + gap;
    return {
      marginLeft: leftMargin,
      marginRight: reservedRight,
      alignSelf: 'stretch' as const,
    };
  }, [isPhoneLayout, width]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isPhoneLayout) return;
      const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
      setShowCompactHeader(offsetY > 140);
    },
    [isPhoneLayout],
  );
  const scrollHandler = useMemo(
    () =>
      isPhoneLayout
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: handleScroll,
          })
        : undefined,
    [handleScroll, isPhoneLayout, scrollY],
  );

  const factBoard = heroFactSections.length ? (
    <View
      style={[
        styles.heroFactBoard,
        !isPhoneLayout && styles.heroFactBoardDesktop,
      ]}
    >
      <View style={[styles.heroFactNav, themeStyles.factNavBorder]} accessibilityRole="tablist">
        {heroFactSections.map((section) => {
          const isActive = section.key === activeFactSection;
          return (
            <Pressable
              key={section.key}
              onPress={() => handleSelectFactSection(section.key)}
              style={styles.heroFactNavItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.heroFactNavLabel,
                    themeStyles.factNavLabel,
                    isActive && styles.heroFactNavLabelActive,
                  ]}
                >
                  {section.label.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.heroFactNavUnderline,
                    isActive && styles.heroFactNavUnderlineActive,
                    isActive && themeStyles.factNavUnderline,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        {activeFactSection && activeFactItems.length ? (
          <Text
            style={[
              styles.heroFactList,
              isPhoneLayout && styles.heroFactListPhone,
              themeStyles.factList,
            ]}
          >
            {activeFactItems.join(', ')}
          </Text>
        ) : null}
      </View>
  ) : null;

  const metricsPanel = quickMetrics.length ? (
    <View
      style={[
        styles.heroMetricsCard,
        themeStyles.heroMetricsCard,
        isPhoneLayout ? styles.heroMetricsCardPhone : styles.heroMetricsCardDesktop,
      ]}
    >
      <View
        style={[
          styles.heroMetrics,
          !isPhoneLayout && styles.heroMetricsDesktop,
        ]}
      >
        {quickMetrics.map((metric) => (
          <View
            key={metric.key}
            style={styles.heroMetricCard}
          >
            <Text
              style={[
                styles.heroMetricLabel,
                themeStyles.heroMetricLabel,
              ]}
            >
              {metric.label}
            </Text>
            <View style={styles.heroMetricValueRow}>
              <Text
                style={[
                  styles.heroMetricValue,
                  themeStyles.heroMetricValue,
                ]}
              >
                {metric.value}
              </Text>
              {metric.suffix ? (
                <Text
                  style={[
                    styles.heroMetricSuffix,
                    themeStyles.heroMetricSuffix,
                  ]}
                >
                  {metric.suffix}
                </Text>
              ) : null}
            </View>
            {metric.meta ? (
              <Text
                style={[
                  styles.heroMetricMeta,
                  themeStyles.heroMetricMeta,
                ]}
              >
                {metric.meta}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  ) : null;

  const desktopMetaRow =
    !isPhoneLayout && (metricsPanel || factBoard) ? (
      <View style={styles.heroMetaRow}>
        {metricsPanel}
        {factBoard}
      </View>
    ) : null;

  const handleReviewSectionLayout = useCallback((event: LayoutChangeEvent) => {
    reviewSectionOffset.current = event.nativeEvent.layout.y;
  }, []);

  const handleJumpToReviews = useCallback(() => {
    const scrollView = scrollViewRef.current;
    if (!scrollView) return;
    const rawNode = (scrollView as unknown as { getNode?: () => unknown }).getNode?.() ?? scrollView;
    const node = rawNode as { scrollTo?: (options: { y: number; animated: boolean }) => void };
    node.scrollTo?.({
      y: Math.max(reviewSectionOffset.current - 80, 0),
      animated: true,
    });
  }, []);

  const handleCloseRateModal = useCallback(() => {
    setShowRateModal(false);
  }, []);

  const handleRateShortcutPress = useCallback(() => {
    if (!isAuthenticated) {
      if (onSignIn) {
        onSignIn();
      }
      return;
    }
    setShowRateModal(true);
  }, [isAuthenticated, onSignIn]);

  const phoneMetaStack =
    isPhoneLayout && (factBoard || metricsPanel) ? (
      <>
        {factBoard}
        {metricsPanel}
      </>
    ) : null;

  const isViewingReplies = reviewModalMode === 'replies';

  const handleReviewModalDismiss = useCallback(() => {
    setReviewModalMode('reviews');
    setReplyModalReviewId(null);
    setReplyModalFromReviews(false);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[styles.heroContentStack, isPhoneLayout && styles.heroContentStackPhone]}>
          <Animated.View
            style={[
              styles.heroMediaCard,
              isPhoneLayout && styles.heroMediaCardPhone,
              !isPhoneLayout && styles.heroMediaCardDesktop,
              heroCardAnimatedStyle,
            ]}
          >
            {heroLandscapeUri ? (
              <View style={[styles.heroMediaImageShell, isPhoneLayout && styles.heroMediaImageShellPhone]}>
                <Image
                  source={{ uri: heroLandscapeUri }}
                  style={styles.heroMediaImage}
                  resizeMode={isPhoneLayout ? 'cover' : 'contain'}
                />
                <LinearGradient
                  colors={heroHorizontalGradient}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.heroMediaFadeHorizontal}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={heroVerticalGradient}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.heroMediaFadeVertical}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(2, 6, 23, 0.85)', 'rgba(2, 6, 23, 0)']}
                  locations={[0, 0.7]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.heroCornerFade, styles.heroCornerFadeLeft]}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(2, 6, 23, 0.9)', 'rgba(2, 6, 23, 0)']}
                  locations={[0, 0.7]}
                  start={{ x: 1, y: 0.5 }}
                  end={{ x: 0, y: 0.5 }}
                  style={[styles.heroCornerFade, styles.heroCornerFadeRight]}
                  pointerEvents="none"
                />
                {isPhoneLayout ? (
                  <LinearGradient
                    colors={['rgba(2, 6, 23, 0)', 'rgba(2, 6, 23, 0.6)', 'rgba(2, 6, 23, 0.95)']}
                    locations={[0, 0.45, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.heroPhoneBlend}
                    pointerEvents="none"
                  />
                ) : null}
              </View>
            ) : (
              <View style={[styles.heroMediaImageShell, styles.heroMediaFallback]}>
                <Text style={styles.heroMediaFallbackText}>Gameplay preview coming soon</Text>
              </View>
            )}
            {isPhoneLayout ? (
              <View style={[styles.heroOverviewThumbnailShell, styles.heroPhoneThumbnailFloating]}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.heroOverviewThumbnailImage} />
                ) : (
                  <View style={styles.heroOverviewThumbnailFallback}>
                    <Text style={styles.heroOverviewThumbnailFallbackText}>Artwork coming soon</Text>
                  </View>
                )}
              </View>
            ) : null}
          </Animated.View>

          {!isPhoneLayout &&
            (coverUri ? (
              <View style={[styles.heroPosterFloat, isWide && styles.heroPosterFloatWide]}>
                <View style={styles.heroPosterWrap}>
                  <Image source={{ uri: coverUri }} style={styles.heroPosterImage} />
                </View>
              </View>
            ) : (
              <View style={[styles.heroPosterFloat, styles.heroPosterFallback]}>
                <View style={styles.heroPosterWrap}>
                  <Text style={styles.heroPosterFallbackText}>Artwork coming soon</Text>
                </View>
              </View>
            ))}

          {isPhoneLayout ? (
            <>
              <View style={[styles.heroPhoneInfoShell, phoneInfoStyle]}>
                <Text style={[styles.heroPhoneTitle, themeStyles.heroPhoneTitle]}>{game.name}</Text>
                {releaseMeta ? (
                  <Text style={[styles.heroPhoneMeta, themeStyles.heroPhoneMeta]}>{releaseMeta}</Text>
                ) : null}
                <View style={styles.heroPhoneActionsRow}>
                  <Pressable
                    onPress={handleWatchTrailer}
                    disabled={!hasTrailer}
                    style={({ pressed }) => [
                      styles.heroPhonePrimaryButton,
                      pressed && styles.heroPhonePrimaryButtonPressed,
                      !hasTrailer && styles.heroActionDisabled,
                    ]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="play" size={16} color="#0f172a" />
                    <Text style={styles.heroPhonePrimaryLabel}>
                      {hasTrailer ? 'Watch trailer' : 'Trailer unavailable'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={favoriteDisabled ? undefined : handleFavoritePress}
                    style={({ pressed }) => [
                      styles.heroPhoneSecondaryButton,
                      themeStyles.heroPhoneSecondaryButton,
                      isFavorite && styles.heroPhoneSecondaryActive,
                      isFavorite && themeStyles.heroPhoneSecondaryActive,
                      pressed && !favoriteDisabled && styles.heroPhoneSecondaryPressed,
                      favoriteDisabled && styles.heroActionDisabled,
                    ]}
                    accessibilityRole="button"
                    disabled={favoriteDisabled}
                  >
                    {favoriteDisabled && !favoriteLimitReached ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <>
                        <Ionicons
                          name={isFavorite ? 'heart' : 'heart-outline'}
                          size={16}
                          color={isFavorite ? FAVORITE_ACCENT : colors.text}
                        />
                        <Text
                          style={[
                            styles.heroPhoneSecondaryLabel,
                            themeStyles.heroPhoneSecondaryLabel,
                            isFavorite && styles.heroPhoneSecondaryLabelActive,
                          ]}
                        >
                          {isFavorite ? 'Favourited' : 'Add to favourites'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
                {favoriteError ? <Text style={styles.favoriteError}>{favoriteError}</Text> : null}
                {favoriteLimitReached ? (
                  <Text style={[styles.favoriteLimitText, styles.heroOverviewFavoriteError]}>
                    You have reached the maximum number of favourite games on the free plan.
                  </Text>
                ) : null}
              </View>
              <View style={styles.heroPhoneAccordionWrapper}>
              <View style={styles.heroPhoneAccordion}>
                <Pressable
                  onPress={handleToggleOverview}
                  style={styles.heroPhoneAccordionHeader}
                  accessibilityRole="button"
                >
                  <Text style={[styles.heroPhoneAccordionLabel, themeStyles.heroPhoneAccordionLabel]}>
                    Overview
                  </Text>
                  <Ionicons
                    name={isOverviewExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.text}
                  />
                </Pressable>
                <Text
                  style={[styles.heroPhoneOverviewText, themeStyles.overviewText]}
                  numberOfLines={!isOverviewExpanded ? 3 : undefined}
                >
                  {overviewText}
                </Text>
              </View>
              </View>
            </>
          ) : (
            <View
              style={[
                styles.heroOverviewCard,
                themeStyles.heroOverviewCard,
                isWide && styles.heroOverviewCardWide,
                isWide && themeStyles.heroOverviewCardWide,
              ]}
            >
              <View style={styles.heroOverviewLayout}>
                <View style={styles.heroOverviewTextColumn}>
                  <Text style={[styles.heroHeadline, themeStyles.heroHeadline]}>{game.name}</Text>
                  <Text style={[styles.heroEyebrow, themeStyles.heroEyebrow]}>
                    {releaseLine ?? 'Upcoming release'}
                  </Text>
                  {!isPhoneLayout ? (
                    <>
                      <View style={[styles.heroActionsRow, styles.heroOverviewActionsRow]}>
                        <Pressable
                          onPress={handleWatchTrailer}
                          disabled={!hasTrailer}
                          style={({ pressed }) => [
                            styles.heroPhonePrimaryButton,
                            pressed && styles.heroPhonePrimaryButtonPressed,
                            !hasTrailer && styles.heroActionDisabled,
                          ]}
                          accessibilityRole="button"
                        >
                          <Ionicons name="play" size={16} color="#0f172a" />
                          <Text style={styles.heroPhonePrimaryLabel}>
                            {hasTrailer ? 'Watch trailer' : 'Trailer unavailable'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={favoriteDisabled ? undefined : handleFavoritePress}
                          style={({ pressed }) => [
                            styles.heroPhoneSecondaryButton,
                            themeStyles.heroPhoneSecondaryButton,
                            isFavorite && styles.heroPhoneSecondaryActive,
                            isFavorite && themeStyles.heroPhoneSecondaryActive,
                            pressed && !favoriteDisabled && styles.heroPhoneSecondaryPressed,
                            favoriteDisabled && styles.heroActionDisabled,
                          ]}
                          accessibilityRole="button"
                          disabled={favoriteDisabled}
                        >
                          {favoriteDisabled && !favoriteLimitReached ? (
                            <ActivityIndicator size="small" color={colors.text} />
                          ) : (
                            <>
                              <Ionicons
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={16}
                                color={isFavorite ? FAVORITE_ACCENT : colors.text}
                              />
                              <Text
                                style={[
                                  styles.heroPhoneSecondaryLabel,
                                  themeStyles.heroPhoneSecondaryLabel,
                                  isFavorite && styles.heroPhoneSecondaryLabelActive,
                                ]}
                              >
                                {isFavorite ? 'Favourited' : 'Add to favourites'}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                      {favoriteError ? (
                        <Text style={[styles.favoriteError, styles.heroOverviewFavoriteError]}>
                          {favoriteError}
                        </Text>
                      ) : null}
                      {favoriteLimitReached ? (
                        <Text style={[styles.favoriteLimitText, styles.heroOverviewFavoriteError]}>
                          You have reached the maximum number of favourite games on the free plan.
                        </Text>
                      ) : null}
                      {desktopMetaRow}
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          )}
          {!isPhoneLayout ? (
            <View
              style={[
                styles.heroOverviewDesktopSection,
                isWide && styles.heroOverviewDesktopSectionWide,
              ]}
            >
              <Pressable
                onPress={handleToggleOverview}
                style={styles.heroOverviewDesktopHeader}
                accessibilityRole="button"
              >
                <Text style={styles.heroPhoneAccordionLabel}>Overview</Text>
                <Ionicons
                  name={isOverviewExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#e2e8f0"
                />
              </Pressable>
                  <Text
                    style={[styles.heroOverviewDesktopText, themeStyles.overviewText]}
                    numberOfLines={overviewNumberOfLines}
                  >
                    {overviewText}
                  </Text>
              <View style={styles.heroOverviewCtaRow}>
                <Pressable
                  onPress={handleRateShortcutPress}
                  style={({ pressed }) => [
                    styles.heroOverviewCtaButton,
                    pressed && styles.heroOverviewCtaButtonPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="star" size={16} color="#0f172a" />
                  <Text style={styles.heroOverviewCtaLabel}>Rate & review</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {phoneMetaStack}
          {isPhoneLayout ? (
            <Pressable
              onPress={handleRateShortcutPress}
              style={({ pressed }) => [
                styles.phoneReviewShortcut,
                pressed && styles.phoneReviewShortcutPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={styles.phoneReviewShortcutIcon}>
                <Ionicons name="star-outline" size={18} color="#f8fafc" />
              </View>
              <Text style={styles.phoneReviewShortcutTitle}>Rate & review</Text>
              <Ionicons name="ellipsis-horizontal" size={18} color="#cbd5f5" />
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.detailSurface,
            themeStyles.surfaceCard,
            !isPhoneLayout && styles.detailSurfaceDesktop,
          ]}
          onLayout={handleReviewSectionLayout}
        >

          <View style={[styles.section, !isPhoneLayout && styles.detailSurfaceSpacer]}>
            <View style={styles.reviewSectionHeader}>
              <Text style={[styles.communitySectionTitle, themeStyles.communityTitle]}>
                Community reviews
              </Text>
            </View>

            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
            {reviewsLoading ? (
              <View style={styles.reviewLoading}>
                <ActivityIndicator size="large" color={colors.accent} />
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
                const useReplyModal = totalReplies > 3;
                const isRepliesExpanded = expandedReplies[review.id] ?? false;
                const resolvedVisible =
                  replyVisibleCounts[review.id] ??
                  (isRepliesExpanded ? getInitialVisibleCount(totalReplies) : 0);
                const visibleReplies = !useReplyModal && isRepliesExpanded
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
                        <Text style={[styles.reviewInitial, themeStyles.reviewInitial]}>
                          {review.author.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      {!isLastReview ? <View style={styles.reviewConnector} /> : null}
                    </View>
                    <View style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text
                          style={[styles.reviewAuthor, themeStyles.reviewAuthor]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {review.author}
                        </Text>
                        <Text style={styles.reviewRating}>{review.rating.toFixed(1)}/10</Text>
                      </View>
                      {review.createdAt ? (
                        <Text style={[styles.reviewDate, themeStyles.reviewDate]}>
                          {formatReviewDate(review.createdAt)}
                        </Text>
                      ) : null}
                      <Text style={[styles.reviewBody, themeStyles.reviewBody]}>{review.body}</Text>
                      {totalReplies > 0 ? (
                        <View style={styles.replyToggleRow}>
                          {useReplyModal ? (
                            <Pressable
                              onPress={() => {
                                setReviewModalMode('replies');
                                setReplyModalReviewId(review.id);
                                setReplyModalFromReviews(true);
                                setShowAllReviewsModal(true);
                              }}
                              style={({ pressed }) => [
                                styles.replyToggleButton,
                                themeStyles.replyToggleButton,
                                pressed && themeStyles.replyToggleButtonActive,
                              ]}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.replyToggleLabel, themeStyles.replyToggleLabel]}>
                                View replies ({totalReplies})
                              </Text>
                            </Pressable>
                          ) : !isRepliesExpanded ? (
                            <Pressable
                              onPress={() => handleToggleReplies(review.id, totalReplies)}
                              style={({ pressed }) => [
                                styles.replyToggleButton,
                                themeStyles.replyToggleButton,
                                pressed && themeStyles.replyToggleButtonActive,
                              ]}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.replyToggleLabel, themeStyles.replyToggleLabel]}>
                                View replies ({totalReplies})
                              </Text>
                            </Pressable>
                          ) : (
                            <>
                              <Pressable
                                onPress={() => handleToggleReplies(review.id, totalReplies)}
                                style={({ pressed }) => [
                                  styles.replyToggleButton,
                                  themeStyles.replyToggleButton,
                                  pressed && themeStyles.replyToggleButtonActive,
                                ]}
                                accessibilityRole="button"
                              >
                                <Text style={[styles.replyToggleLabel, themeStyles.replyToggleLabel]}>
                                  Hide replies
                                </Text>
                              </Pressable>
                              {remainingReplies > 0 ? (
                                <Pressable
                                  onPress={() => handleLoadMoreReplies(review.id, totalReplies)}
                                  style={({ pressed }) => [
                                    styles.replyToggleSecondaryButton,
                                    themeStyles.replyToggleButton,
                                    pressed && themeStyles.replyToggleButtonActive,
                                  ]}
                                  accessibilityRole="button"
                                >
                                  <Text style={[styles.replyToggleSecondaryLabel, themeStyles.replyToggleLabel]}>
                                    See more replies (+{remainingReplies})
                                  </Text>
                                </Pressable>
                              ) : null}
                            </>
                          )}
                        </View>
                      ) : null}
                      {!useReplyModal && isRepliesExpanded && visibleReplies.length > 0 && (
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
                    <View
                      style={[
                        styles.replyComposer,
                        replyComposerOpen[review.id]
                          ? styles.replyComposerExpanded
                          : styles.replyComposerCollapsed,
                      ]}
                    >
                      {isAuthenticated ? (
                        replyComposerOpen[review.id] ? (
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
                            onPress={() =>
                              totalReplies > 3
                                ? handleOpenReplyModal(review.id)
                                : handleOpenReplyComposer(review.id, totalReplies)
                            }
                            style={({ pressed }) => [
                              styles.replyCompactButton,
                              pressed && styles.replyCompactButtonPressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#cbd5f5" />
                            <Text style={styles.replyCompactLabel}>Reply</Text>
                          </Pressable>
                        )
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
                onPress={shouldUseReviewModal ? handleOpenAllReviews : handleLoadMoreCommunityReviews}
                style={({ pressed }) => [
                  styles.communityLoadMoreButton,
                  themeStyles.communityLoadMoreButton,
                  pressed && themeStyles.communityLoadMoreButtonActive,
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.communityLoadMoreLabel, themeStyles.communityLoadMoreLabel]}>
                  {shouldUseReviewModal
                    ? `See all reviews (${reviews.length})`
                    : `See more reviews (+${remainingCommunityReviews})`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {similarGames.length > 0 && (
          <View
            style={[
              styles.section,
              isPhoneLayout ? styles.similarSectionPhone : styles.similarSectionDesktop,
            ]}
          >
            <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Similar games</Text>
            <FlatList
              data={similarGames}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                isPhoneLayout ? styles.similarListContentPhone : styles.similarListContentDesktop
              }
              ItemSeparatorComponent={() => <View style={styles.similarSeparator} />}
              renderItem={({ item }) => (
                <GameCard
                  game={item}
                  containerStyle={[
                    styles.similarCard,
                    isPhoneLayout ? styles.similarCardPhone : styles.similarCardDesktop,
                  ]}
                  onPress={onSelectSimilar ? () => onSelectSimilar(item) : undefined}
                />
              )}
            />
          </View>
        )}
        {onOpenAffiliate && (
            <View
              style={[
                styles.affiliateSection,
                themeStyles.affiliateSection,
                !isPhoneLayout && styles.similarSectionDesktop,
              ]}
            >
            <View style={styles.affiliateHeader}>
              <Text style={[styles.affiliateTitle, themeStyles.affiliateTitle]}>
                You may want to buy
              </Text>
              <Text style={[styles.affiliateSubtitle, themeStyles.affiliateSubtitle]}>
                We may earn a small commission if you purchase through these links.
              </Text>
            </View>

            {affiliateSuggestions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.affiliateList,
                  isPhoneLayout
                    ? styles.similarListContentPhone
                    : styles.similarListContentDesktop,
                ]}
              >
                {affiliateSuggestions.map((suggestion, index) => {
                  const isLast = index === affiliateSuggestions.length - 1;
                  return (
                    <Pressable
                      key={suggestion.id}
                      onPress={() => {
                        Linking.openURL(suggestion.url).catch((err) => {
                          console.error('Unable to open affiliate link', err);
                        });
                      }}
                      style={({ pressed }) => [
                        styles.affiliateCard,
                        isPhoneLayout
                          ? styles.similarCardPhone
                          : isWide
                            ? styles.similarCardDesktop
                            : styles.similarCard,
                        styles.affiliateCardWrap,
                        isLast && styles.affiliateCardWrapLast,
                        pressed && styles.affiliateCardPressed,
                      ]}
                    >
                      <View style={styles.affiliateCardCover}>
                        {(() => {
                          const imageUri = suggestion.imageUrl ?? affiliateFallbackUri;
                          if (imageUri) {
                            return (
                              <Image
                                source={{ uri: imageUri }}
                                style={styles.affiliateCardImage}
                                resizeMode="contain"
                              />
                            );
                          }
                          return (
                            <View style={styles.affiliateCardFallback}>
                              <Text style={styles.affiliateCardFallbackText}>No image</Text>
                            </View>
                          );
                        })()}
                      </View>
                      <View style={styles.affiliateCardLabelWrap}>
                        <Text
                          style={[
                            styles.affiliateCardLabel,
                            themeStyles.affiliateCardLabel,
                          ]}
                          numberOfLines={2}
                        >
                          {suggestion.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.affiliateList}>
                <Pressable
                  onPress={onOpenAffiliate}
                  style={({ pressed }) => [
                    styles.affiliateButton,
                    styles.affiliateItem,
                    themeStyles.affiliateButton,
                    pressed && styles.affiliateButtonPressed,
                    pressed && themeStyles.affiliateButtonPressed,
                  ]}
                >
                  <Text style={[styles.affiliateButtonLabel, themeStyles.affiliateButtonLabel]}>
                    View "{game.name}" on Amazon
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

      </Animated.ScrollView>
      {shouldShowNativeBackControls ? (
        <SafeAreaView
          pointerEvents="box-none"
          style={[styles.heroSafeArea, showCompactHeader && styles.heroSafeAreaSolid]}
        >
          {!showCompactHeader && onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.heroBackButtonFloat,
                pressed && styles.heroBackButtonFloatPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={18} color="#f8fafc" />
            </Pressable>
          ) : null}
          {showCompactHeader ? (
            <View style={styles.heroTopBarRow}>
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [
                    styles.heroTopBarButton,
                    pressed && styles.heroTopBarButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Ionicons name="chevron-back" size={18} color="#f8fafc" />
                </Pressable>
              ) : (
                <View style={styles.heroTopBarButtonPlaceholder} />
              )}
              <Text style={[styles.heroTopBarTitle, themeStyles.heroTopBarTitle]} numberOfLines={1}>
                {game.name}
              </Text>
              <View style={styles.heroTopBarButtonPlaceholder} />
            </View>
          ) : null}
        </SafeAreaView>
      ) : null}
     <Modal
        animationType="none"
        visible={showRateModal}
        presentationStyle={isPhoneLayout ? 'pageSheet' : 'overFullScreen'}
        transparent={!isPhoneLayout}
        onRequestClose={handleCloseRateModal}
      >
        <SafeAreaView style={[styles.rateModalSafeArea, themeStyles.rateModalSafeArea]}>
          <View
            style={[
              styles.rateModalFrame,
              !isPhoneLayout && styles.rateModalFrameDesktop,
            ]}
          >
            <View
              style={[
                styles.rateModalSheet,
                themeStyles.rateModalSheet,
                !isPhoneLayout && styles.rateModalSheetDesktop,
              ]}
            >
              <View style={styles.rateModalHeader}>
                <Pressable
                  onPress={handleCloseRateModal}
                  style={({ pressed }) => [
                    styles.rateModalHeaderButton,
                    pressed && styles.rateModalHeaderButtonPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.rateModalHeaderButtonLabel}>Cancel</Text>
                </Pressable>
                <Text style={styles.rateModalTitle}>Rate & review</Text>
                <Pressable
                  onPress={handleSubmitReview}
                  disabled={reviewCtaDisabled}
                  style={({ pressed }) => [
                    styles.rateModalSaveButton,
                    (pressed || reviewCtaDisabled) && styles.rateModalSaveButtonDisabled,
                  ]}
                  accessibilityRole="button"
                >
                  {reviewSubmitting ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text style={styles.rateModalSaveLabel}>Save</Text>
                  )}
                </Pressable>
              </View>
              <ScrollView
                style={styles.rateModalScroll}
                contentContainerStyle={styles.rateModalContent}
                keyboardShouldPersistTaps="handled"
              >
                {showFormFeedbackInModal && formError ? (
                  <Text style={styles.formError}>{formError}</Text>
                ) : null}
                {showFormFeedbackInModal && formSuccess ? (
                  <Text style={styles.formSuccess}>{formSuccess}</Text>
                ) : null}
                <View style={styles.rateModalGameRow}>
                  {coverUri ? (
                    <Image source={{ uri: coverUri }} style={styles.rateModalCover} />
                  ) : (
                    <View style={styles.rateModalCoverFallback}>
                      <Text style={[styles.rateModalCoverFallbackText, themeStyles.rateModalCoverFallbackText]}>
                        No art
                      </Text>
                    </View>
                  )}
                  <View style={styles.rateModalGameCopy}>
                    <Text style={[styles.rateModalGameTitle, themeStyles.rateModalGameTitle]}>
                      {game.name}
                    </Text>
                    {releaseLine ? (
                      <Text style={[styles.rateModalGameMeta, themeStyles.rateModalGameMeta]}>
                        {releaseLine}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rateModalSection}>
                  <Text style={[styles.rateModalLabel, themeStyles.rateModalLabel]}>Rate</Text>
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
                            size={24}
                            color={isActive ? themeStyles.ratingStarActive : themeStyles.ratingStarInactive}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.ratingMetaRow}>
                    <Text style={[styles.ratingSelectedValue, themeStyles.ratingSelectedValue]}>
                      {ratingInput === null ? 'No rating yet' : `${ratingInput}/10 selected`}
                    </Text>
                    {ratingInput !== null ? (
                      <Pressable
                        onPress={handleClearRating}
                        style={({ pressed }) => [
                          styles.ratingClearButton,
                          themeStyles.ratingClearButton,
                          pressed && themeStyles.ratingClearButtonActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.ratingClearLabel, themeStyles.ratingClearLabel]}>Clear</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rateModalSection}>
                  <Text style={[styles.rateModalLabel, themeStyles.rateModalLabel]}>Add review</Text>
                  {reviewLimitLabel ? (
                    <Text style={styles.reviewLimitHelper}>{reviewLimitLabel}</Text>
                  ) : null}
                  <TextInput
                    value={reviewInput}
                    onChangeText={setReviewInput}
                    placeholder={REVIEW_PLACEHOLDER}
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[styles.rateModalTextarea, themeStyles.rateModalTextarea]}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="none"
        visible={showAllReviewsModal}
        presentationStyle={isPhoneLayout ? 'pageSheet' : 'overFullScreen'}
        transparent={!isPhoneLayout}
        onRequestClose={handleCloseAllReviews}
        onDismiss={handleReviewModalDismiss}
      >
        <SafeAreaView style={styles.fullModalSafeArea}>
          <View
            style={[
              styles.fullModalSheet,
              !isPhoneLayout && styles.fullModalSheetDesktop,
            ]}
          >
            <View style={styles.fullModalHeader}>
              <Pressable
                onPress={
                  isViewingReplies
                    ? handleCloseReplyModal
                    : handleCloseAllReviews
                }
                style={({ pressed }) => [
                  styles.fullModalHeaderButton,
                  pressed && styles.fullModalHeaderButtonPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.fullModalHeaderButtonLabel}>
                  {isViewingReplies && !replyModalFromReviews ? 'Back' : 'Close'}
                </Text>
              </Pressable>
              <Text style={styles.fullModalTitle}>{isViewingReplies ? 'Replies' : 'All reviews'}</Text>
              {isViewingReplies && !replyModalFromReviews ? (
                <View style={styles.fullModalHeaderActions}>
                  <Pressable
                    onPress={handleReplyArrowCta}
                    style={({ pressed }) => [
                      styles.fullModalIconButton,
                      pressed && styles.fullModalIconButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="arrow-forward" size={18} color="#cbd5f5" />
                  </Pressable>
                  <Pressable
                    onPress={handleCloseReplyModal}
                    style={({ pressed }) => [
                      styles.fullModalHeaderButton,
                      pressed && styles.fullModalHeaderButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.fullModalHeaderButtonLabel}>Close</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.fullModalHeaderButtonPlaceholder} />
              )}
            </View>
            <ScrollView
              style={styles.fullModalScroll}
              contentContainerStyle={styles.fullModalContent}
              keyboardShouldPersistTaps="handled"
            >
              {isViewingReplies
                ? (() => {
                    const review = reviews.find((item) => item.id === replyModalReviewId);
                    if (!review) return null;
                    const replyDraft = replyDrafts[review.id] ?? '';
                    const replyError = replyErrors[review.id] ?? null;
                    const replySuccessMessage = replySuccess[review.id] ?? null;
                    const isReplySubmitting = replySubmittingSet.has(review.id);
                    return (
                      <View style={styles.fullModalReviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text
                            style={styles.reviewAuthor}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {review.author}
                          </Text>
                          <Text style={styles.reviewRating}>{review.rating.toFixed(1)}/10</Text>
                        </View>
                        {review.createdAt ? (
                          <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
                        ) : null}
                        <Text style={styles.reviewBody}>{review.body}</Text>
                        <View style={styles.replyList}>
                          {(review.replies ?? []).map((reply) => {
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
                                      {editError ? <Text style={styles.replyErrorText}>{editError}</Text> : null}
                                      {editSuccessMessage ? (
                                        <Text style={styles.replySuccessText}>{editSuccessMessage}</Text>
                                      ) : null}
                                      <View style={styles.replyEditActions}>
                                        <Pressable
                                          onPress={() => handleCancelReplyEdit(reply.id)}
                                          style={({ pressed }) => [
                                            styles.replyCancelButton,
                                            pressed && styles.replyCancelButtonPressed,
                                          ]}
                                          accessibilityRole="button"
                                        >
                                          <Text style={styles.replyCancelLabel}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={() => handleSubmitReplyEdit(review.id, reply.id)}
                                          disabled={isUpdating}
                                          style={({ pressed }) => [
                                            styles.replySaveButton,
                                            pressed && styles.replySaveButtonPressed,
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
                        {isAuthenticated ? (
                          <View style={[styles.replyComposer, styles.replyComposerExpanded]}>
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
                              disabled={replyDraft.trim().length <= 0 || isReplySubmitting}
                              style={({ pressed }) => [
                                styles.replyButton,
                                (replyDraft.trim().length <= 0 || isReplySubmitting) &&
                                  styles.replyButtonDisabled,
                                pressed &&
                                  replyDraft.trim().length > 0 &&
                                  !isReplySubmitting &&
                                  styles.replyButtonPressed,
                              ]}
                              accessibilityRole="button"
                            >
                              {isReplySubmitting ? (
                                <ActivityIndicator size="small" color="#f8fafc" />
                              ) : (
                                <Text style={styles.replyButtonLabel}>Reply</Text>
                              )}
                            </Pressable>
                          </View>
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
                    );
                  })()
                : reviews.map((review) => {
                    const replyDraft = replyDrafts[review.id] ?? '';
                    const replyError = replyErrors[review.id] ?? null;
                    const replySuccessMessage = replySuccess[review.id] ?? null;
                    const isReplySubmitting = replySubmittingSet.has(review.id);
                    const totalReplies = review.replies?.length ?? 0;
                    return (
                      <View key={review.id} style={styles.fullModalReviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text
                            style={styles.reviewAuthor}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {review.author}
                          </Text>
                          <Text style={styles.reviewRating}>{review.rating.toFixed(1)}/10</Text>
                        </View>
                        {review.createdAt ? (
                          <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
                        ) : null}
                          <Text style={styles.reviewBody}>{review.body}</Text>
                          {totalReplies > 0 ? (
                            <Pressable
                              onPress={() => handleOpenReplyModal(review.id, true)}
                              style={({ pressed }) => [
                                styles.replyToggleButton,
                                pressed && styles.replyToggleButtonPressed,
                              ]}
                              accessibilityRole="button"
                          >
                            <Text style={styles.replyToggleLabel}>View replies ({totalReplies})</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => handleOpenReplyComposer(review.id, totalReplies)}
                          style={({ pressed }) => [
                            styles.replyCompactButton,
                            pressed && styles.replyCompactButtonPressed,
                          ]}
                          accessibilityRole="button"
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#cbd5f5" />
                          <Text style={styles.replyCompactLabel}>Reply</Text>
                        </Pressable>
                        {replyComposerOpen[review.id] ? (
                          <View style={[styles.replyComposer, styles.replyComposerExpanded]}>
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
                              disabled={replyDraft.trim().length <= 0 || isReplySubmitting}
                              style={({ pressed }) => [
                                styles.replyButton,
                                (replyDraft.trim().length <= 0 || isReplySubmitting) &&
                                  styles.replyButtonDisabled,
                                pressed &&
                                  replyDraft.trim().length > 0 &&
                                  !isReplySubmitting &&
                                  styles.replyButtonPressed,
                              ]}
                              accessibilityRole="button"
                            >
                              {isReplySubmitting ? (
                                <ActivityIndicator size="small" color="#f8fafc" />
                              ) : (
                                <Text style={styles.replyButtonLabel}>Reply</Text>
                              )}
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function resolveCoverUri(raw?: string | null) {
  const normalized = normalizeImageUri(raw);
  if (!normalized) return undefined;
  if (!normalized.includes('images.igdb.com')) {
    return normalized;
  }
  return applyIgdbSize(normalized, 't_cover_big');
}

function resolveBackdropUri(raw?: string | null) {
  const normalized = normalizeImageUri(raw);
  if (!normalized) return undefined;
  if (!normalized.includes('images.igdb.com')) {
    return normalized;
  }
  const isCoverAsset = /\/co\d+/i.test(normalized);
  const targetSize = isCoverAsset ? 't_cover_big' : 't_1080p';
  return applyIgdbSize(normalized, targetSize);
}

function normalizeImageUri(raw?: string | null) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
}

function applyIgdbSize(uri: string, sizeToken: string) {
  if (!/\/t_[^/]+\//.test(uri)) {
    return uri;
  }
  return uri.replace(/\/t_[^/]+\//, `/${sizeToken}/`);
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
  screen: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 48,
  },
  bodyWrapper: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    gap: 32,
  },
  heroContentStack: {
    gap: 20,
  },
  heroContentStackPhone: {
    paddingBottom: 12,
  },
  heroSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
  },
  heroSafeAreaSolid: {
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.5)',
  },
  heroTopBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
  },
  heroBackButtonFloat: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 8,
  },
  heroBackButtonFloatPressed: {
    backgroundColor: 'rgba(2, 6, 23, 1)',
  },
  heroTopBarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
  },
  heroTopBarButtonPressed: {
    backgroundColor: 'rgba(2, 6, 23, 1)',
  },
  heroTopBarButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  heroTopBarTitle: {
    flex: 1,
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 15,
  },
  heroTopBarTitleSpacer: {
    flex: 1,
  },
  heroMediaCard: {
    width: '100%',
    aspectRatio: 21 / 9,
    borderRadius: 36,
    position: 'relative',
    marginBottom: 32,
  },
  heroMediaCardDesktop: {
    aspectRatio: undefined,
    height: 450,
  },
  heroMediaCardPhone: {
    borderRadius: 0,
    aspectRatio: undefined,
    height: 270,
    marginBottom: -48,
  },
  heroMediaImageShell: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroMediaImageShellPhone: {
    borderRadius: 0,
  },
  heroMediaImage: {
    width: '100%',
    height: '100%',
  },
  heroMediaFadeHorizontal: {
    ...StyleSheet.absoluteFillObject,
  },
  heroMediaFadeVertical: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCornerFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 180,
  },
  heroCornerFadeLeft: {
    left: 0,
  },
  heroCornerFadeRight: {
    right: 0,
  },
  heroPhoneBlend: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -80,
    height: 200,
  },
  heroMediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  heroMediaFallbackText: {
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  heroDetailsRow: {
    flexDirection: 'column',
    gap: 20,
  },
  heroDetailsRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 32,
  },
  heroDetailsColumn: {
    flex: 1,
    gap: 16,
  },
  heroDetailsColumnPrimary: {
    minWidth: 0,
  },
  heroPosterFloat: {
    width: 220,
    alignSelf: 'center',
    marginTop: -130,
    zIndex: 5,
  },
  heroPosterFloatWide: {
    alignSelf: 'flex-start',
    marginLeft: 364,
    marginTop: -100,
  },
  heroPosterWrap: {
    width: '100%',
    borderRadius: 28,
    padding: 12,
    backgroundColor: 'rgba(4, 7, 18, 0)',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroPosterImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 20,
  },
  heroPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPosterFallbackText: {
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  heroOverviewCard: {
    width: '100%',
    borderRadius: 28,
    padding: 4,
    backgroundColor: 'rgba(2, 6, 23, 0.2)',
    gap: 12,
    marginTop: -120,
    shadowColor: '#01030a',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroOverviewCardWide: {
    alignSelf: 'flex-end',
    marginTop: -320,
    marginLeft: 50,
    marginRight: 310,
    maxWidth: 525,
    paddingHorizontal: 40,
    paddingVertical: 2,
  },
  heroPhoneInfoShell: {
    marginTop: -20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  heroPhoneAccordionWrapper: {
    alignSelf: 'stretch',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  heroPhoneTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroPhoneMeta: {
    color: '#cbd5f5',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroPhoneActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroPhonePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
  },
  heroPhonePrimaryButtonPressed: {
    opacity: 0.85,
  },
  heroPhonePrimaryLabel: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  heroPhoneSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.4)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  heroPhoneSecondaryPressed: {
    opacity: 0.75,
  },
  heroPhoneSecondaryActive: {
    borderColor: '#f472b6',
    backgroundColor: 'rgba(248, 250, 252, 0.12)',
  },
  heroPhoneSecondaryLabel: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 13,
  },
  heroPhoneSecondaryLabelActive: {
    color: '#f472b6',
  },
  heroPhoneAccordion: {
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    paddingTop: 12,
    gap: 8,
  },
  heroPhoneAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPhoneAccordionLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  heroPhoneOverviewText: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 22,
  },
  heroOverviewLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  heroOverviewLayoutPhone: {
    flexDirection: 'column',
  },
  heroOverviewTextColumn: {
    flex: 1,
    gap: 12,
  },
  heroOverviewThumbnailShell: {
    width: 120,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.12)',
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
  },
  heroPhoneThumbnailFloating: {
    position: 'absolute',
    right: 20,
    bottom: -138,
    shadowColor: '#01030a',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroOverviewThumbnailImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  heroOverviewThumbnailFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  heroOverviewThumbnailFallbackText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroHeadline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroHeadlinePhone: {
    fontSize: 34,
    lineHeight: 38,
  },
  heroOverviewText: {
    color: '#cbd5f5',
    fontSize: 15,
    lineHeight: 22,
  },
  heroOverviewTextPhone: {
    fontSize: 14,
    lineHeight: 21,
    color: '#d5dbfa',
  },
  heroOverviewToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  heroOverviewToggleText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroOverviewDesktopSection: {
    width: '100%',
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(4, 7, 18, 0.7)',
    marginTop: 20,
    gap: 12,
  },
  heroOverviewDesktopSectionWide: {
    alignSelf: 'flex-end',
    marginRight: 178,
    marginLeft: 50,
    maxWidth: 640,
    paddingHorizontal: 36,
    paddingVertical: 26,
    shadowColor: '#01030a',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  heroOverviewDesktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroOverviewDesktopText: {
    color: '#cbd5f5',
    fontSize: 15,
    lineHeight: 22,
  },
  heroOverviewCtaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  heroOverviewCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
  },
  heroOverviewCtaButtonPressed: {
    backgroundColor: '#f59e0b',
  },
  heroOverviewCtaLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroDetailsBody: {
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
    fontSize: 36,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroFactBoard: {
    width: '100%',
    gap: 14,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  heroFactBoardDesktop: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 18,
    maxWidth: 480,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 24,
    marginTop: 28,
  },
  heroFactNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingBottom: 8,
  },
  heroFactNavItem: {
    alignItems: 'center',
  },
  heroFactNavLabel: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.6,
  },
  heroFactNavLabelActive: {
    opacity: 1,
  },
  heroFactNavUnderline: {
    marginTop: 6,
    width: '100%',
    height: 2,
    backgroundColor: 'transparent',
  },
  heroFactNavUnderlineActive: {
    backgroundColor: '#10b981',
  },
  heroFactList: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 22,
  },
  heroFactListPhone: {
    textAlign: 'left',
  },
  phoneReviewPeek: {
    alignSelf: 'stretch',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  phoneReviewPeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneReviewPeekTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  phoneReviewPeekButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  phoneReviewPeekButtonPressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  phoneReviewPeekButtonLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneReviewPeekBody: {
    gap: 4,
  },
  phoneReviewPeekAuthor: {
    color: '#bae6fd',
    fontSize: 13,
    fontWeight: '700',
  },
  phoneReviewPeekSnippet: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
  },
  phoneReviewPeekEmpty: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  phoneReviewShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.35)',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  phoneReviewShortcutPressed: {
    backgroundColor: '#172133',
  },
  phoneReviewShortcutIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneReviewShortcutTitle: {
    flex: 1,
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  heroMetricsCard: {
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 16,
  },
  heroMetricsCardDesktop: {
    flex: 1,
    maxWidth: 420,
    paddingLeft: 0,
    paddingRight: 0,
  },
  heroMetricsCardPhone: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  heroOverviewActionsRow: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  heroOverviewFavoriteError: {
    marginTop: -4,
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
    borderColor: '#f472b6',
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
  },
  heroSecondaryButtonLabel: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  heroSecondaryButtonLabelActive: {
    color: '#f472b6',
  },
  heroActionDisabled: {
    opacity: 0.5,
  },
  favoriteError: {
    color: '#fca5a5',
    fontSize: 13,
  },
  favoriteLimitText: {
    marginTop: 4,
    fontSize: 12,
    color: '#fca5a5',
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetricsDesktop: {
    flexDirection: 'column',
    gap: 18,
    alignItems: 'stretch',
  },
  heroMetricCard: {
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    gap: 4,
    flexGrow: 1,
    minWidth: 110,
  },
  heroMetricLabel: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroMetricValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  heroMetricSuffix: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  heroMetricMeta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  detailSurface: {
    gap: 24,
    borderRadius: 28,
    padding: 24,
    backgroundColor: 'transparent',
  },
  detailSurfaceDesktop: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  detailSurfaceSpacer: {
    marginTop: 24,
  },
  reviewHighlights: {
    flexDirection: 'row',
    gap: 16,
  },
  reviewHighlightsPhone: {
    flexDirection: 'column',
  },
  reviewHighlightCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 16,
    gap: 6,
    minWidth: 0,
  },
  reviewHighlightLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  reviewHighlightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  reviewHighlightValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  reviewHighlightSuffix: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewHighlightMeta: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  reviewHighlightButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  reviewHighlightButtonPressed: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  reviewHighlightButtonLabel: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 12,
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
    alignItems: 'flex-start',
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
  communitySectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 0.3,
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
    gap: 12,
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
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
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
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
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
    flex: 1,
    minWidth: 0,
  },
  reviewRating: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewDate: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  reviewBody: {
    color: '#e2e8f0',
    lineHeight: 20,
    marginTop: 2,
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
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  communityLoadMoreButtonPressed: {
    backgroundColor: 'rgba(99, 102, 241, 0.28)',
  },
  communityLoadMoreLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
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
  },
  replyComposerCollapsed: {
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  replyComposerExpanded: {
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
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
  replyCompactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    alignSelf: 'flex-start',
  },
  replyCompactButtonPressed: {
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  replyCompactLabel: {
    color: '#cbd5f5',
    fontSize: 12,
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
  reviewFormToggle: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  reviewFormTogglePressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  reviewFormToggleLabel: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
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
  rateModalSafeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  rateModalFrame: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rateModalFrameDesktop: {
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
  },
  rateModalSheet: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRadius: 22,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  rateModalSheetDesktop: {
    maxWidth: 820,
    width: '92%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  fullModalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
  },
  fullModalSheet: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 22,
    paddingBottom: 24,
    backgroundColor: '#0c1624',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  fullModalSheetDesktop: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    marginHorizontal: 0,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  fullModalHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fullModalHeaderButtonPressed: {
    opacity: 0.7,
  },
  fullModalHeaderButtonLabel: {
    color: '#cbd5f5',
    fontSize: 15,
    fontWeight: '600',
  },
  fullModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullModalIconButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fullModalIconButtonPressed: {
    opacity: 0.7,
  },
  fullModalHeaderButtonPlaceholder: {
    width: 60,
  },
  fullModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  fullModalScroll: {
    flex: 1,
  },
  fullModalContent: {
    paddingBottom: 24,
    gap: 16,
  },
  fullModalReviewCard: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    gap: 6,
  },
  rateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rateModalHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  rateModalHeaderButtonPressed: {
    opacity: 0.7,
  },
  rateModalHeaderButtonLabel: {
    color: '#cbd5f5',
    fontSize: 15,
    fontWeight: '600',
  },
  rateModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  rateModalSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  rateModalSaveButtonDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  rateModalSaveLabel: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  rateModalScroll: {
    flex: 1,
  },
  rateModalContent: {
    paddingBottom: 32,
    gap: 20,
  },
  rateModalGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  rateModalCover: {
    width: 64,
    height: 96,
    borderRadius: 12,
  },
  rateModalCoverFallback: {
    width: 64,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateModalCoverFallbackText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  rateModalGameCopy: {
    flex: 1,
    gap: 2,
  },
  rateModalGameTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  rateModalGameMeta: {
    color: '#94a3b8',
    fontSize: 13,
  },
  rateModalSection: {
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingTop: 16,
  },
  rateModalLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  rateModalTextarea: {
    minHeight: 250,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0b1220',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
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
  similarListContentPhone: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  similarListContentDesktop: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  similarSeparator: {
    width: 16,
  },
  similarCard: {
    width: 220,
  },
  similarCardPhone: {
    width: 150,
  },
  similarCardDesktop: {
    width: 200,
  },
  similarSectionPhone: {
    paddingHorizontal: 12,
  },
  similarSectionDesktop: {
    paddingHorizontal: 4,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  affiliateSection: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'transparent',
    gap: 16,
  },
  affiliateHeader: {
    gap: 4,
  },
  affiliateList: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingLeft: 12,
  },
  affiliateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  affiliateSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  affiliateButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  affiliateItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    width: '100%',
  },
  affiliateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  affiliateItemImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#111827',
  },
  affiliateItemText: {
    flex: 1,
    gap: 2,
  },
  affiliateItemSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  affiliateCard: {
    borderRadius: 20,
    backgroundColor: '#070b14',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
  },
  affiliateCardPressed: {
    opacity: 0.92,
  },
  affiliateCardHover: {
    transform: [{ scale: 1.035 }],
    shadowOpacity: 0.55,
    shadowRadius: 34,
    elevation: 18,
  },
  affiliateCardWrap: {
    marginRight: 16,
  },
  affiliateCardWrapLast: {
    marginRight: 0,
  },
  affiliateCardCover: {
    width: '100%',
    aspectRatio: 3/3,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  affiliateCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  affiliateCardFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  affiliateCardFallbackText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  affiliateCardLabelWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  affiliateCardLabel: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
  affiliateButtonPressed: {
    opacity: 0.8,
  },
  affiliateButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
