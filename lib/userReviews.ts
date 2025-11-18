import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { db } from './firebase';
import { getFriendlyModerationMessage } from './errors';
import type { UserReviewSummary } from '../types/game';

function mapUserReview(id: string, data: any): UserReviewSummary {
  const createdAt =
    data?.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined;
  const updatedAt =
    data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;

  return {
    id,
    gameId: Number.isFinite(Number(data?.gameId)) ? Number(data.gameId) : id ? Number(id) || 0 : 0,
    gameName: data?.gameName ?? `Game #${data?.gameId ?? id}`,
    rating:
      typeof data?.rating === 'number' && !Number.isNaN(data.rating) ? data.rating : 0,
    body: data?.body ?? '',
    createdAt,
    updatedAt,
    gameCover: data?.gameCover ?? null,
  };
}

export function useUserReviews(uid?: string | null) {
  const [reviews, setReviews] = useState<UserReviewSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setReviews([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const reviewsRef = collection(db, 'userCommunity', uid, 'reviews');
    const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => mapUserReview(docSnap.id, docSnap.data()));
        setReviews(next);
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        const friendly = getFriendlyModerationMessage(
          snapshotError,
          'Unable to load your reviews right now.',
        );
        setError(new Error(friendly));
        setLoading(false);
        setReviews([]);
      },
    );

    return unsubscribe;
  }, [uid]);

  return useMemo(
    () => ({
      reviews,
      loading,
      error,
    }),
    [reviews, loading, error],
  );
}
