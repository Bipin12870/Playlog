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

export function mapFavoriteDocument(data: any): UserFavorite | null {
  if (typeof data?.id !== 'number' || typeof data?.name !== 'string') {
    return null;
  }

  const savedAt =
    data?.savedAt instanceof Timestamp ? data.savedAt.toDate().toISOString() : undefined;

  const favorite: GameSummary = {
    id: data.id,
    name: data.name,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    cover: typeof data.cover === 'object' && data.cover !== null ? data.cover : undefined,
    platforms: Array.isArray(data.platforms) ? data.platforms : undefined,
    first_release_date:
      typeof data.first_release_date === 'number' ? data.first_release_date : undefined,
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
          .map((docSnap) => mapFavoriteDocument(docSnap.data()))
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
