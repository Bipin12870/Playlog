import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from 'firebase/firestore';

import { db } from '../firebase';
import type { GameSummary } from '../../types/game';

export type UserFavorite = GameSummary & { savedAt?: string | null };

function resolveNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

export function mapFavoriteDocument(data: any, docId?: string): UserFavorite | null {
  const gameData = data?.game ?? data;
  const resolvedId =
    resolveNumericId(data?.id) ??
    resolveNumericId(data?.gameId) ??
    resolveNumericId(gameData?.id) ??
    resolveNumericId(gameData?.gameId) ??
    (typeof docId === 'string' ? resolveNumericId(docId) : null);

  const resolvedName =
    typeof data?.name === 'string'
      ? data.name
      : typeof gameData?.name === 'string'
        ? gameData.name
        : null;

  if (resolvedId === null || !resolvedName) {
    return null;
  }

  const rawSavedAt = data?.savedAt ?? gameData?.savedAt;
  const rawAddedAt = data?.addedAt ?? gameData?.addedAt;
  const toIsoString = (value: unknown): string | undefined => {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && value !== null && typeof (value as any).toDate === 'function') {
      try {
        return (value as any).toDate().toISOString();
      } catch (err) {
        return undefined;
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
    if (typeof value === 'string') return value;
    return undefined;
  };

  const savedAt =
    toIsoString(rawSavedAt) ??
    toIsoString(rawAddedAt) ??
    undefined;

  const favorite: GameSummary = {
    id: resolvedId,
    name: resolvedName,
    summary:
      typeof data.summary === 'string'
        ? data.summary
        : typeof gameData?.summary === 'string'
          ? gameData.summary
          : undefined,
    rating:
      typeof data.rating === 'number'
        ? data.rating
        : typeof gameData?.rating === 'number'
          ? gameData.rating
          : undefined,
    cover:
      typeof data.cover === 'object' && data.cover !== null
        ? data.cover
        : typeof gameData?.cover === 'object' && gameData.cover !== null
          ? gameData.cover
          : undefined,
    platforms: Array.isArray(data.platforms)
      ? data.platforms
      : Array.isArray(gameData?.platforms)
        ? gameData.platforms
        : undefined,
    first_release_date:
      typeof data.first_release_date === 'number'
        ? data.first_release_date
        : typeof gameData?.first_release_date === 'number'
          ? gameData.first_release_date
          : undefined,
  };

  return { ...favorite, savedAt } as UserFavorite;
}

export function useUserFavorites(uid?: string | null) {
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setFavorites([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const favoritesRef = collection(db, 'users', uid, 'favorites');
    const favoritesQuery = query(favoritesRef, orderBy('savedAt', 'desc'));

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => mapFavoriteDocument(docSnap.data(), docSnap.id))
          .filter((entry): entry is UserFavorite => entry !== null);
        setFavorites(items);
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setFavorites([]);
        setLoading(false);
        setError(snapshotError);
      },
    );

    return unsubscribe;
  }, [uid]);

  return useMemo(
    () => ({
      favorites,
      loading,
      error,
    }),
    [favorites, loading, error],
  );
}
