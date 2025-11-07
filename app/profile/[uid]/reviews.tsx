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
import { useUserReviews } from '../../../lib/userReviews';
import { useUserProfile } from '../../../lib/userProfile';
import type { UserReviewSummary } from '../../../types/game';

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

  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
  });
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
  } = useUserReviews(canView ? targetUid : null);

  if (initializing || profileLoading || (canView && reviewsLoading)) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        {profileError ? <Text style={styles.emptyCopy}>{profileError.message}</Text> : null}
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="lock-closed" size={36} color="#f9fafb" />
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
      {reviews.map((review) => {
        return (
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
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
    backgroundColor: '#0f172a',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
  privateState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  privateTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  privateCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  emptyCardTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCardCopy: {
    color: '#cbd5f5',
    fontSize: 14,
  },
  reviewItem: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    gap: 12,
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
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewDate: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewRatingValue: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewBody: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
});
