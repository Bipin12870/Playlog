import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import type { GameDetailsData, GameReview } from '../types/game';

export const MAX_REVIEWS_PER_USER = 10;

type ReviewInput = {
  rating: number;
  body: string;
  game?: {
    id: number;
    name: string;
    cover?: { url?: string | null } | null;
  };
};

type ReviewStats = {
  reviewCount: number;
  averageRating: number | null;
};

const DEFAULT_STATS: ReviewStats = {
  reviewCount: 0,
  averageRating: null,
};

function resolveGameDocId(gameId: number) {
  return gameId.toString();
}

function mapReviewDocument(id: string, data: any): GameReview {
  const createdAt =
    data?.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined;
  const updatedAt =
    data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;

  return {
    id,
    userId: data?.userId ?? '',
    author: data?.author ?? 'Anonymous',
    body: data?.body ?? '',
    rating: typeof data?.rating === 'number' ? data.rating : 0,
    createdAt,
    updatedAt,
  };
}

export function subscribeToGameReviews(
  gameId: number,
  callback: (reviews: GameReview[]) => void,
  onError?: (error: Error) => void,
) {
  const docId = resolveGameDocId(gameId);
  const reviewsRef = collection(db, 'gameCommunity', docId, 'reviews');
  const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const next = snapshot.docs.map((docSnap) => mapReviewDocument(docSnap.id, docSnap.data()));
      callback(next);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to game reviews', error);
      }
    },
  );
}

export function subscribeToGameReviewStats(
  gameId: number,
  callback: (stats: ReviewStats) => void,
  onError?: (error: Error) => void,
) {
  const docId = resolveGameDocId(gameId);
  const statsRef = doc(db, 'gameCommunity', docId);

  return onSnapshot(
    statsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(DEFAULT_STATS);
        return;
      }
      const data = snapshot.data();
      callback({
        reviewCount: typeof data?.reviewCount === 'number' ? data.reviewCount : 0,
        averageRating:
          typeof data?.averageRating === 'number' && !Number.isNaN(data.averageRating)
            ? data.averageRating
            : null,
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to game review stats', error);
      }
    },
  );
}

export async function submitGameReview(gameId: number, user: User, input: ReviewInput) {
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new Error('INVALID_RATING_RANGE');
  }
  const body = input.body?.trim();
  if (!body) {
    throw new Error('REVIEW_BODY_REQUIRED');
  }

  const docId = resolveGameDocId(gameId);
  const statsRef = doc(db, 'gameCommunity', docId);
  const reviewRef = doc(collection(statsRef, 'reviews'), user.uid);
  const userStatsRef = doc(db, 'userCommunity', user.uid);
  const userReviewRef = doc(collection(userStatsRef, 'reviews'), docId);

  await runTransaction(db, async (transaction) => {
    const [statsSnap, reviewSnap, userStatsSnap] = await Promise.all([
      transaction.get(statsRef),
      transaction.get(reviewRef),
      transaction.get(userStatsRef),
    ]);

    const statsData = statsSnap.exists() ? statsSnap.data() : {};
    const currentCount = typeof statsData.reviewCount === 'number' ? statsData.reviewCount : 0;
    const currentTotalRating =
      typeof statsData.totalRating === 'number' ? statsData.totalRating : 0;

    const now = serverTimestamp();
    const author = user.displayName ?? user.email ?? 'Anonymous';
    const gameName = input.game?.name ?? `Game #${gameId}`;
    const gameCover = input.game?.cover ?? null;

    const userStatsData = userStatsSnap.exists() ? userStatsSnap.data() : {};
    const userReviewCount =
      typeof userStatsData.reviewCount === 'number' ? userStatsData.reviewCount : 0;

    if (!reviewSnap.exists() && userReviewCount >= MAX_REVIEWS_PER_USER) {
      throw new Error('REVIEW_LIMIT_REACHED');
    }

    let nextCount = currentCount;
    let nextTotalRating = currentTotalRating;

    let nextUserReviewCount = userReviewCount;

    if (reviewSnap.exists()) {
      const existing = reviewSnap.data();
      const previousRating =
        typeof existing?.rating === 'number' && !Number.isNaN(existing.rating) ? existing.rating : 0;
      const existingCreatedAt = existing?.createdAt ?? now;
      nextTotalRating = currentTotalRating - previousRating + rating;
      transaction.set(
        reviewRef,
        {
          userId: user.uid,
          author,
          rating,
          body,
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.set(
        userReviewRef,
        {
          gameId,
          gameName,
          gameCover,
          rating,
          body,
          createdAt: existingCreatedAt ?? now,
          updatedAt: now,
        },
        { merge: true },
      );
    } else {
      nextCount = currentCount + 1;
      nextTotalRating = currentTotalRating + rating;
      nextUserReviewCount = userReviewCount + 1;
      transaction.set(reviewRef, {
        userId: user.uid,
        author,
        rating,
        body,
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(userReviewRef, {
        gameId,
        gameName,
        gameCover,
        rating,
        body,
        createdAt: now,
        updatedAt: now,
      });
    }

    const averageRating = nextCount > 0 ? nextTotalRating / nextCount : null;

    transaction.set(
      statsRef,
      {
        reviewCount: nextCount,
        totalRating: nextTotalRating,
        averageRating,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      userStatsRef,
      {
        reviewCount: nextUserReviewCount,
        updatedAt: now,
      },
      { merge: true },
    );
  });
}

export async function deleteGameReview(gameId: number, user: User) {
  const docId = resolveGameDocId(gameId);
  const statsRef = doc(db, 'gameCommunity', docId);
  const reviewRef = doc(collection(statsRef, 'reviews'), user.uid);
  const userStatsRef = doc(db, 'userCommunity', user.uid);
  const userReviewRef = doc(collection(userStatsRef, 'reviews'), docId);

  await runTransaction(db, async (transaction) => {
    const [statsSnap, reviewSnap, userStatsSnap] = await Promise.all([
      transaction.get(statsRef),
      transaction.get(reviewRef),
      transaction.get(userStatsRef),
    ]);

    if (!reviewSnap.exists()) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    const statsData = statsSnap.exists() ? statsSnap.data() : {};
    const currentCount = typeof statsData.reviewCount === 'number' ? statsData.reviewCount : 0;
    const currentTotalRating =
      typeof statsData.totalRating === 'number' ? statsData.totalRating : 0;

    const existing = reviewSnap.data();
    const previousRating =
      typeof existing?.rating === 'number' && !Number.isNaN(existing.rating) ? existing.rating : 0;

    const nextCount = Math.max(0, currentCount - 1);
    const nextTotalRating = currentTotalRating - previousRating;
    const averageRating = nextCount > 0 ? nextTotalRating / nextCount : null;
    const now = serverTimestamp();

    transaction.delete(reviewRef);
    transaction.set(
      statsRef,
      {
        reviewCount: nextCount,
        totalRating: nextTotalRating,
        averageRating,
        updatedAt: now,
      },
      { merge: true },
    );

    const userStatsData = userStatsSnap.exists() ? userStatsSnap.data() : {};
    const userReviewCount =
      typeof userStatsData.reviewCount === 'number' ? userStatsData.reviewCount : 0;
    const nextUserReviewCount = Math.max(0, userReviewCount - 1);

    transaction.set(
      userStatsRef,
      {
        reviewCount: nextUserReviewCount,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.delete(userReviewRef);
  });
}

export async function setGameFavorite(
  userId: string,
  game: GameDetailsData,
  shouldFavorite: boolean,
) {
  const favoriteRef = doc(db, 'users', userId, 'favorites', resolveGameDocId(game.id));

  if (shouldFavorite) {
    await setDoc(
      favoriteRef,
      {
        id: game.id,
        name: game.name,
        cover: game.cover ?? null,
        summary: game.summary ?? null,
        rating: typeof game.rating === 'number' ? game.rating : null,
        addedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    await deleteDoc(favoriteRef);
  }
}

export function subscribeToFavoriteStatus(
  userId: string,
  gameId: number,
  callback: (isFavorite: boolean) => void,
  onError?: (error: Error) => void,
) {
  const favoriteRef = doc(db, 'users', userId, 'favorites', resolveGameDocId(gameId));
  return onSnapshot(
    favoriteRef,
    (snapshot) => {
      callback(snapshot.exists());
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to favourite status', error);
      }
    },
  );
}

export function subscribeToUserReviewStats(
  userId: string,
  callback: (count: number) => void,
  onError?: (error: Error) => void,
) {
  const statsRef = doc(db, 'userCommunity', userId);
  return onSnapshot(
    statsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(0);
        return;
      }
      const data = snapshot.data();
      callback(typeof data?.reviewCount === 'number' ? data.reviewCount : 0);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to user review stats', error);
      }
    },
  );
}
