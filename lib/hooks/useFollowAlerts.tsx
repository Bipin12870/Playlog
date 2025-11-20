import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type FollowAlertContextValue = {
  followersCount: number;
  followingCount: number;
  pendingRequests: number;
  hasFollowerAlerts: boolean;
  hasFollowingAlerts: boolean;
  hasAnyAlerts: boolean;
  acknowledgeFollowers: () => void;
  acknowledgeFollowing: () => void;
};

const defaultAlertValue: FollowAlertContextValue = {
  followersCount: 0,
  followingCount: 0,
  pendingRequests: 0,
  hasFollowerAlerts: false,
  hasFollowingAlerts: false,
  hasAnyAlerts: false,
  acknowledgeFollowers: () => {},
  acknowledgeFollowing: () => {},
};

const STORAGE_PREFIX = '@playlog:followAlerts:';

const FollowAlertContext = createContext<FollowAlertContextValue>(defaultAlertValue);

type SeenCounts = {
  followersSeen: number;
  followingSeen: number;
};

type FollowAlertProviderProps = {
  uid?: string | null;
  followersCount: number;
  followingCount: number;
  pendingRequests: number;
  ready: boolean;
  children: ReactNode;
};

export function FollowAlertProvider({
  uid,
  followersCount,
  followingCount,
  pendingRequests,
  ready,
  children,
}: FollowAlertProviderProps) {
  const storageKey = uid ? `${STORAGE_PREFIX}${uid}` : null;
  const [seenCounts, setSeenCounts] = useState<SeenCounts | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!storageKey || !ready) {
      setSeenCounts(null);
      setLoaded(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SeenCounts>;
          setSeenCounts({
            followersSeen:
              typeof parsed?.followersSeen === 'number' ? parsed.followersSeen : followersCount,
            followingSeen:
              typeof parsed?.followingSeen === 'number' ? parsed.followingSeen : followingCount,
          });
        } else {
          const initial = { followersSeen: followersCount, followingSeen: followingCount };
          setSeenCounts(initial);
          AsyncStorage.setItem(storageKey, JSON.stringify(initial)).catch((error) => {
            console.warn('Failed to persist initial follow alert state', error);
          });
        }
        setLoaded(true);
      } catch (error) {
        console.warn('Failed to load follow alert state', error);
        if (active) {
          const fallback = { followersSeen: followersCount, followingSeen: followingCount };
          setSeenCounts(fallback);
          setLoaded(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [storageKey, ready, followersCount, followingCount]);

  useEffect(() => {
    if (!storageKey || !ready || !loaded || !seenCounts) {
      return;
    }
    const nextFollowersSeen = Math.min(seenCounts.followersSeen, followersCount);
    const nextFollowingSeen = Math.min(seenCounts.followingSeen, followingCount);
    if (
      nextFollowersSeen !== seenCounts.followersSeen ||
      nextFollowingSeen !== seenCounts.followingSeen
    ) {
      const next = { followersSeen: nextFollowersSeen, followingSeen: nextFollowingSeen };
      setSeenCounts(next);
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((error) => {
        console.warn('Failed to update follow alert state', error);
      });
    }
  }, [followersCount, followingCount, storageKey, ready, loaded, seenCounts]);

  const acknowledgeFollowers = useCallback(() => {
    if (!storageKey || !loaded || !seenCounts) {
      return;
    }
    if (seenCounts.followersSeen === followersCount) {
      return;
    }
    const next = { ...seenCounts, followersSeen: followersCount };
    setSeenCounts(next);
    AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((error) => {
      console.warn('Failed to update follower alerts', error);
    });
  }, [storageKey, loaded, seenCounts, followersCount]);

  const acknowledgeFollowing = useCallback(() => {
    if (!storageKey || !loaded || !seenCounts) {
      return;
    }
    if (seenCounts.followingSeen === followingCount) {
      return;
    }
    const next = { ...seenCounts, followingSeen: followingCount };
    setSeenCounts(next);
    AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((error) => {
      console.warn('Failed to update following alerts', error);
    });
  }, [storageKey, loaded, seenCounts, followingCount]);

  const hasStoredCounts = loaded && Boolean(seenCounts);
  const hasNewFollowers =
    hasStoredCounts && seenCounts ? followersCount > seenCounts.followersSeen : false;
  const hasNewFollowing =
    hasStoredCounts && seenCounts ? followingCount > seenCounts.followingSeen : false;

  const hasFollowerAlerts = pendingRequests > 0 || hasNewFollowers;
  const hasFollowingAlerts = hasNewFollowing;
  const hasAnyAlerts = hasFollowerAlerts || hasFollowingAlerts;

  const value = useMemo<FollowAlertContextValue>(
    () => ({
      followersCount,
      followingCount,
      pendingRequests,
      hasFollowerAlerts,
      hasFollowingAlerts,
      hasAnyAlerts,
      acknowledgeFollowers,
      acknowledgeFollowing,
    }),
    [
      followersCount,
      followingCount,
      pendingRequests,
      hasFollowerAlerts,
      hasFollowingAlerts,
      hasAnyAlerts,
      acknowledgeFollowers,
      acknowledgeFollowing,
    ],
  );

  return <FollowAlertContext.Provider value={value}>{children}</FollowAlertContext.Provider>;
}

export function useFollowAlertsContext() {
  return useContext(FollowAlertContext) ?? defaultAlertValue;
}
