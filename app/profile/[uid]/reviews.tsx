import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { canViewerAccessProfile } from '../../../lib/profileVisibility';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { useBlockRelationships } from '../../../lib/hooks/useBlockRelationships';
import { useUserReviews } from '../../../lib/userReviews';
import { useUserProfile } from '../../../lib/userProfile';
import type { UserReviewSummary } from '../../../types/game';
import { useTheme, type ThemeColors } from '../../../lib/theme';

function formatReviewTimestamp(value?: string | null) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PublicReviewsScreen() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const { user, initializing } = useAuthUser();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  const viewerUid = user?.uid ?? null;
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(targetUid);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const blockRelationships = useBlockRelationships(viewerUid);
  const viewerBlockedTarget = targetUid ? blockRelationships.isBlocking(targetUid) : false;
  const viewerIsBlockedByTarget = targetUid ? blockRelationships.isBlockedBy(targetUid) : false;

  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
    hasBlocked: viewerBlockedTarget,
    isBlockedBy: viewerIsBlockedByTarget,
  });
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
  } = useUserReviews(canView ? targetUid : null);

  if (initializing || profileLoading || (canView && reviewsLoading)) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        {profileError ? <Text style={styles.emptyCopy}>{profileError.message}</Text> : null}
      </View>
    );
  }

  if (viewerBlockedTarget || viewerIsBlockedByTarget) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="ban" size={36} color={colors.text} />
        <Text style={styles.privateTitle}>User not available</Text>
        <Text style={styles.privateCopy}>
          {viewerBlockedTarget
            ? 'You have blocked this player. Unblock them to read their reviews.'
            : 'This player has blocked you. Their reviews are hidden.'}
        </Text>
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="lock-closed" size={36} color={colors.text} />
        <Text style={styles.privateTitle}>Reviews are hidden</Text>
        <Text style={styles.privateCopy}>
          {hasPendingRequest
            ? 'Follow request sent. Reviews will be visible once it is approved.'
            : 'This account is private. Follow and wait for approval to read their reviews.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{profile.displayName}'s reviews</Text>
      </View>
      {reviewsError ? <Text style={styles.errorText}>{reviewsError.message}</Text> : null}
      {reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>No reviews yet</Text>
          <Text style={styles.emptyCardCopy}>
            {profile.displayName} has not shared any reviews with the community.
          </Text>
        </View>
      ) : null}
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewItem}>
          <View style={styles.reviewHeaderRow}>
            <View style={styles.reviewHeaderCopy}>
              <Text style={styles.reviewGame}>{review.gameName}</Text>
              <Text style={styles.reviewDate}>
                {formatReviewTimestamp(review.createdAt ?? review.updatedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.reviewRatingRow}>
            <Ionicons name="star" size={16} color="#facc15" />
            <Text style={styles.reviewRatingValue}>{review.rating.toFixed(1)}/10</Text>
          </View>
          <Text style={styles.reviewBody} numberOfLines={4}>
            {review.body}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  const card = colors.surface;
  const cardAlt = colors.surfaceSecondary;
  return StyleSheet.create({
    page: {
      padding: 16,
      gap: 16,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
      backgroundColor: colors.background,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    emptyCopy: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    privateState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
      backgroundColor: colors.background,
    },
    privateTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    privateCopy: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    emptyCard: {
      backgroundColor: cardAlt,
      borderRadius: 16,
      padding: 24,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyCardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyCardCopy: {
      color: colors.muted,
      fontSize: 14,
    },
    reviewItem: {
      backgroundColor: card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    reviewHeaderCopy: {
      gap: 4,
      flex: 1,
    },
    reviewGame: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    reviewDate: {
      color: colors.muted,
      fontSize: 12,
    },
    reviewRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    reviewRatingValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    reviewBody: {
      color: colors.text,
      fontSize: 14,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
  });
}
