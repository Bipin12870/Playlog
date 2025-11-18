import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from 'firebase/firestore';

import { db } from '../firebase';
import { useFollowing } from './useFollowList';
import { mapFavoriteDocument, type UserFavorite } from './useUserFavorites';
import type { GameSummary } from '../../types/game';

type UseFriendFavoriteGamesOptions = {
  friendLimit?: number;
  gamesPerFriend?: number;
  maxGames?: number;
};

export type FriendFavoriteMeta = {
  friendIds: string[];
  friendNames: string[];
};

export type FriendFavoriteGame = GameSummary & {
  friendMeta: FriendFavoriteMeta;
  savedAt?: string | null;
};

export function useFriendFavoriteGames(
  uid?: string | null,
  options?: UseFriendFavoriteGamesOptions,
) {
  const friendLimit = options?.friendLimit ?? 5;
  const gamesPerFriend = options?.gamesPerFriend ?? 4;
  const maxGames = options?.maxGames ?? 12;

  const { edges: followingEdges, loading: followingLoading } = useFollowing(uid ?? null, {
    pageSize: friendLimit,
  });

  const activeFriends = useMemo(
    () => (followingEdges?.length ? followingEdges.slice(0, friendLimit) : []),
    [followingEdges, friendLimit],
  );

  const [favoritesByFriend, setFavoritesByFriend] = useState<Record<string, UserFavorite[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!activeFriends.length) {
      setFavoritesByFriend({});
      return;
    }

    setFavoritesByFriend((prev) => {
      const next: Record<string, UserFavorite[]> = {};
      activeFriends.forEach(({ uid: friendUid }) => {
        if (prev[friendUid]) {
          next[friendUid] = prev[friendUid];
        }
      });
      return next;
    });
  }, [activeFriends]);

  useEffect(() => {
    if (!uid || activeFriends.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const readyFriends = new Set<string>();
    const unsubscribers: Array<() => void> = [];

    activeFriends.forEach((friend) => {
      const favoritesRef = collection(db, 'users', friend.uid, 'favorites');
      const favoritesQuery = query(
        favoritesRef,
        orderBy('savedAt', 'desc'),
        limitQuery(gamesPerFriend),
      );

      const unsubscribe = onSnapshot(
        favoritesQuery,
        (snapshot) => {
          const items = snapshot.docs
            .map((docSnap) => mapFavoriteDocument(docSnap.data()))
            .filter((entry): entry is UserFavorite => Boolean(entry));

          setFavoritesByFriend((prev) => ({
            ...prev,
            [friend.uid]: items,
          }));

          readyFriends.add(friend.uid);
          if (readyFriends.size === activeFriends.length) {
            setLoading(false);
          }
        },
        (snapshotError) => {
          console.warn('Failed to load friend favourites', snapshotError);
          setError(snapshotError);
          readyFriends.add(friend.uid);
          if (readyFriends.size === activeFriends.length) {
            setLoading(false);
          }
        },
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, activeFriends, gamesPerFriend]);

  const games = useMemo<FriendFavoriteGame[]>(() => {
    if (!uid || activeFriends.length === 0) return [];

    const friendNameMap = new Map(
      activeFriends.map((friend) => [friend.uid, friend.displayName || 'Friend']),
    );
    const aggregate = new Map<number, FriendFavoriteGame>();

    activeFriends.forEach((friend) => {
      const favorites = favoritesByFriend[friend.uid] ?? [];
      favorites.forEach((favorite) => {
        const friendName = friendNameMap.get(friend.uid) ?? 'Friend';
        const existing = aggregate.get(favorite.id);

        if (existing) {
          if (!existing.friendMeta.friendIds.includes(friend.uid)) {
            existing.friendMeta.friendIds.push(friend.uid);
            existing.friendMeta.friendNames.push(friendName);
          }
          if (
            !existing.savedAt ||
            (favorite.savedAt && Date.parse(favorite.savedAt) > Date.parse(existing.savedAt))
          ) {
            existing.savedAt = favorite.savedAt;
          }
        } else {
          aggregate.set(favorite.id, {
            ...favorite,
            friendMeta: {
              friendIds: [friend.uid],
              friendNames: [friendName],
            },
          });
        }
      });
    });

    const toTimestamp = (value?: string | null) => {
      if (!value) return 0;
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Array.from(aggregate.values())
      .sort((a, b) => {
        const byTime = toTimestamp(b.savedAt) - toTimestamp(a.savedAt);
        if (byTime !== 0) return byTime;
        return b.friendMeta.friendIds.length - a.friendMeta.friendIds.length;
      })
      .slice(0, maxGames);
  }, [uid, activeFriends, favoritesByFriend, maxGames]);

  return {
    games,
    loading: followingLoading || loading,
    error,
    hasFriends: activeFriends.length > 0,
  };
}
