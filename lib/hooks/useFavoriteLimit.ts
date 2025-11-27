import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { MAX_FAVORITES_PER_USER, getUserFavoritesCollectionRef } from '../community';

export function useFavoriteLimit(userId: string | null, isPremium: boolean) {
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    if (!userId || isPremium) {
      setFavoriteCount(0);
      return;
    }

    const favRef = getUserFavoritesCollectionRef(userId);

    const unsubscribe = onSnapshot(favRef, (snapshot) => {
      // Ignore optimistic local writes; only trust server-confirmed counts
      if (snapshot.metadata.hasPendingWrites) {
        console.log('[FAV LIMIT] pending write snapshot ignored', {
          userId,
          size: snapshot.size,
        });
        return;
      }

      setFavoriteCount(snapshot.size);
    });

    return unsubscribe;
  }, [userId, isPremium]);

  const favoriteLimitReached = !isPremium && favoriteCount >= MAX_FAVORITES_PER_USER;
  const maxFavorites = isPremium ? Number.POSITIVE_INFINITY : MAX_FAVORITES_PER_USER;

  return { favoriteCount, favoriteLimitReached, maxFavorites };
}
