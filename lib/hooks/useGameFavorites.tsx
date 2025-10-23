import { Alert } from 'react-native';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { IdTokenResult, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import type { GameSummary } from '../../types/game';
import { db } from '../firebase';
import { useAuthUser } from './useAuthUser';

const MAX_FREE_FAVOURITES = 10;

type GameFavoritesContextValue = {
  favourites: GameSummary[];
  toggleFavourite: (game: GameSummary) => void;
  removeFavourite: (gameId: number) => void;
  isFavourite: (gameId: number) => boolean;
  maxFavourites: number;
  remainingSlots: number;
  hasUnlimitedFavorites: boolean;
  isAuthenticated: boolean;
};

const GameFavoritesContext = createContext<GameFavoritesContextValue | undefined>(undefined);

export function GameFavoritesProvider({ children }: { children: ReactNode }) {
  const [favourites, setFavourites] = useState<GameSummary[]>([]);
  const [hasUnlimitedFavorites, setHasUnlimitedFavorites] = useState(false);
  const { user } = useAuthUser();

  const loadFavourites = useCallback(async (currentUser: User) => {
    const favouritesRef = collection(db, 'users', currentUser.uid, 'favorites');
    const snapshot = await getDocs(favouritesRef);

    const entries = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as Partial<GameSummary> & {
          savedAt?: { toMillis?: () => number };
        };

        if (typeof data?.id !== 'number' || typeof data?.name !== 'string') {
          return null;
        }

        const savedAt = typeof data.savedAt?.toMillis === 'function' ? data.savedAt.toMillis() : 0;

        const game: GameSummary = {
          id: data.id,
          name: data.name,
          summary: typeof data.summary === 'string' ? data.summary : undefined,
          rating: typeof data.rating === 'number' ? data.rating : undefined,
          cover: typeof data.cover === 'object' && data.cover !== null ? data.cover : undefined,
          platforms: Array.isArray(data.platforms) ? data.platforms : undefined,
          first_release_date:
            typeof data.first_release_date === 'number' ? data.first_release_date : undefined,
        };

        return { savedAt, game };
      })
      .filter(
        (entry): entry is { savedAt: number; game: GameSummary } => entry !== null
      )
      .sort((a, b) => b.savedAt - a.savedAt)
      .map((entry) => entry.game);

    return entries;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function resolveSubscription(nextUser: typeof user) {
      if (!nextUser) {
        if (isMounted) {
          setHasUnlimitedFavorites(false);
        }
        return;
      }

      try {
        const token: IdTokenResult = await nextUser.getIdTokenResult();
        const claims = token?.claims ?? {};
        const subscriptionActive =
          claims.subscriptionActive === true ||
          claims.subscription === 'active' ||
          claims.plan === 'premium' ||
          claims.plan === 'pro' ||
          claims.tier === 'unlimited';

        if (isMounted) {
          setHasUnlimitedFavorites(Boolean(subscriptionActive));
        }
      } catch (error) {
        console.warn('Failed to load subscription info', error);
        if (isMounted) {
          setHasUnlimitedFavorites(false);
        }
      }
    }

    resolveSubscription(user);

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFavourites([]);
      return;
    }

    let cancelled = false;

    loadFavourites(user)
      .then((games) => {
        if (!cancelled) {
          setFavourites(games);
        }
      })
      .catch((error) => {
        console.warn('Failed to load favourites', error);
        if (!cancelled) {
          setFavourites([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loadFavourites]);

  const isFavourite = useCallback(
    (gameId: number) => favourites.some((game) => game.id === gameId),
    [favourites]
  );

  const removeFavourite = useCallback(
    (gameId: number) => {
      if (!user) {
        return;
      }

      const existing = favourites.find((game) => game.id === gameId);

      setFavourites((prev) => prev.filter((game) => game.id !== gameId));

      const favouriteRef = doc(db, 'users', user.uid, 'favorites', gameId.toString());
      deleteDoc(favouriteRef).catch((error) => {
        console.warn('Failed to remove favourite', error);
        if (!existing) {
          return;
        }
        setFavourites((prev) => {
          if (prev.some((game) => game.id === gameId)) {
            return prev;
          }
          return [...prev, existing];
        });
        Alert.alert('Unable to remove favourite', 'Please try again.');
      });
    },
    [user, favourites]
  );

  const toggleFavourite = useCallback(
    (game: GameSummary) => {
      if (!user) {
        Alert.alert(
          'Sign in required',
          'Create an account or log in to keep track of your favourite games.'
        );
        return;
      }

      const favouriteRef = doc(db, 'users', user.uid, 'favorites', game.id.toString());
      const exists = isFavourite(game.id);

      if (exists) {
        setFavourites((prev) => prev.filter((item) => item.id !== game.id));
        deleteDoc(favouriteRef).catch((error) => {
          console.warn('Failed to remove favourite', error);
          Alert.alert('Unable to remove favourite', 'Please try again.');
          setFavourites((prev) => {
            if (prev.some((item) => item.id === game.id)) {
              return prev;
            }
            return [...prev, game];
          });
        });
        return;
      }

      let added = false;
      setFavourites((prev) => {
        if (prev.some((item) => item.id === game.id)) {
          return prev;
        }
        if (!hasUnlimitedFavorites && prev.length >= MAX_FREE_FAVOURITES) {
          return prev;
        }
        added = true;
        return [...prev, game];
      });

      if (!added) {
        if (!hasUnlimitedFavorites) {
          Alert.alert(
            'Limit reached',
            `You can only save up to ${MAX_FREE_FAVOURITES} favourites with your current plan.`
          );
        }
        return;
      }

      const payload: Record<string, unknown> = {
        id: game.id,
        name: game.name,
        savedAt: serverTimestamp(),
      };

      if (typeof game.summary === 'string') {
        payload.summary = game.summary;
      }
      if (typeof game.rating === 'number') {
        payload.rating = game.rating;
      }
      if (game.cover && typeof game.cover === 'object') {
        payload.cover = game.cover;
      }
      if (Array.isArray(game.platforms)) {
        payload.platforms = game.platforms;
      }
      if (typeof game.first_release_date === 'number') {
        payload.first_release_date = game.first_release_date;
      }

      setDoc(favouriteRef, payload).catch((error) => {
        console.warn('Failed to save favourite', error);
        Alert.alert('Unable to save favourite', 'Please try again.');
        setFavourites((prev) => prev.filter((item) => item.id !== game.id));
      });
    },
    [user, hasUnlimitedFavorites, isFavourite]
  );

  const value = useMemo<GameFavoritesContextValue>(() => {
    const maxFavourites = !user
      ? 0
      : hasUnlimitedFavorites
        ? Number.POSITIVE_INFINITY
        : MAX_FREE_FAVOURITES;
    const remainingSlots = !user
      ? 0
      : hasUnlimitedFavorites
        ? Number.POSITIVE_INFINITY
        : Math.max(0, MAX_FREE_FAVOURITES - favourites.length);

    return {
      favourites,
      toggleFavourite,
      removeFavourite,
      isFavourite,
      maxFavourites,
      remainingSlots,
      hasUnlimitedFavorites,
      isAuthenticated: Boolean(user),
    };
  }, [
    favourites,
    toggleFavourite,
    removeFavourite,
    isFavourite,
    user,
    hasUnlimitedFavorites,
  ]);

  return <GameFavoritesContext.Provider value={value}>{children}</GameFavoritesContext.Provider>;
}

export function useGameFavorites() {
  const context = useContext(GameFavoritesContext);
  if (!context) {
    throw new Error('useGameFavorites must be used within a GameFavoritesProvider');
  }
  return context;
}
