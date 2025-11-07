import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { deleteGameReview } from '../../../lib/community';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useUserReviews } from '../../../lib/userReviews';
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

export default function ProfileReviewsScreen() {
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const router = useRouter();
  const {
    reviews,
    loading,
    error,
  } = useUserReviews(uid);
  const [feedback, setFeedback] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const emptyState = useMemo(
    () => ({
      title: 'No reviews yet',
      copy: 'Head to a game page to share your thoughts with the community.',
    }),
    [],
  );

  const handleEditReview = (review: UserReviewSummary) => {
    router.push({
      pathname: '/game/[id]',
      params: { id: review.gameId.toString(), name: review.gameName },
    });
  };

  const handleDeleteReview = async (review: UserReviewSummary) => {
    if (!user) return;
    setFeedback(null);
    setDeletingReviewId(review.id);
    try {
      await deleteGameReview(review.gameId, user);
      setFeedback({ type: 'success', message: 'Review deleted.' });
    } catch (err) {
      console.error(err);
      let message = 'Unable to delete review.';
      if (err instanceof Error) {
        if (err.message === 'REVIEW_NOT_FOUND') {
          message = 'We could not find that review.';
        } else {
          message = err.message;
        }
      }
      setFeedback({ type: 'error', message });
    } finally {
      setDeletingReviewId(null);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to manage your reviews</Text>
        <Text style={styles.emptyCopy}>
          Once you are logged in you can edit or delete the reviews you have posted.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your reviews</Text>
        {loading ? <ActivityIndicator size="small" color="#818cf8" /> : null}
      </View>
      {feedback ? (
        <Text style={feedback.type === 'success' ? styles.successText : styles.errorText}>
          {feedback.message}
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
      {!loading && reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyCardCopy}>{emptyState.copy}</Text>
        </View>
      ) : null}
      {reviews.map((review) => {
        const isDeleting = deletingReviewId === review.id;
        return (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeaderRow}>
              <View style={styles.reviewHeaderCopy}>
                <Text style={styles.reviewGame}>{review.gameName}</Text>
                <Text style={styles.reviewDate}>
                  {formatReviewTimestamp(review.createdAt ?? review.updatedAt)}
                </Text>
              </View>
              <View style={styles.reviewActions}>
                <Pressable
                  onPress={() => handleEditReview(review)}
                  style={({ pressed }) => [
                    styles.reviewActionButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="create-outline" size={16} color="#2563eb" />
                  <Text style={styles.reviewActionLabel}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteReview(review)}
                  disabled={isDeleting}
                  style={({ pressed }) => [
                    styles.reviewActionButton,
                    styles.reviewDeleteButton,
                    (pressed || isDeleting) && styles.reviewDeletePressed,
                  ]}
                  accessibilityRole="button"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#f8fafc" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#f8fafc" />
                      <Text style={styles.reviewDeleteLabel}>Delete</Text>
                    </>
                  )}
                </Pressable>
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
  successText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '600',
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
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  reviewActionLabel: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewDeleteButton: {
    backgroundColor: '#ef4444',
  },
  reviewDeletePressed: {
    opacity: 0.85,
  },
  reviewDeleteLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
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
