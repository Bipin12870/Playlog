import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { GameDetailsData, GameSummary } from '../../types/game';

const CACHE_KEY = 'playlog:game-details-cache';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const CACHE_LIMIT = 25;

type CachePayload = {
  details: GameDetailsData;
  similar: GameSummary[];
};

type CacheEntry = CachePayload & {
  timestamp: number;
};

type CacheState = Record<string, CacheEntry>;

type GameDetailsCacheContextValue = {
  cacheReady: boolean;
  getCachedDetails: (id: number) => CachePayload | null;
  cacheGameDetails: (id: number, payload: CachePayload) => void;
  clearCachedDetails: (id: number) => void;
};

const GameDetailsCacheContext = createContext<GameDetailsCacheContextValue | undefined>(undefined);

export function GameDetailsCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CacheState>({});
  const [cacheReady, setCacheReady] = useState(false);
  const cacheRef = useRef(cache);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    let cancelled = false;
    const loadCache = async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (cancelled || !stored) {
          return;
        }
        const parsed = parseStoredCache(stored);
        if (Object.keys(parsed).length) {
          setCache((prev) => ({
            ...parsed,
            ...prev,
          }));
        }
      } catch (error) {
        console.warn('Failed to load game details cache', error);
      } finally {
        if (!cancelled) {
          setCacheReady(true);
        }
      }
    };

    loadCache();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch((error) => {
      console.warn('Failed to persist game details cache', error);
    });
  }, [cache, cacheReady]);

  const getCachedDetails = useCallback((id: number) => {
    const key = id.toString();
    const entry = cacheRef.current[key];
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return {
      details: entry.details,
      similar: entry.similar,
    };
  }, []);

  const cacheGameDetails = useCallback((id: number, payload: CachePayload) => {
    const key = id.toString();
    setCache((prev) => {
      const next: CacheState = {
        ...prev,
        [key]: {
          ...payload,
          timestamp: Date.now(),
        },
      };
      return enforceCacheLimit(next);
    });
  }, []);

  const clearCachedDetails = useCallback((id: number) => {
    const key = id.toString();
    setCache((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      cacheReady,
      getCachedDetails,
      cacheGameDetails,
      clearCachedDetails,
    }),
    [cacheReady, getCachedDetails, cacheGameDetails, clearCachedDetails],
  );

  return (
    <GameDetailsCacheContext.Provider value={value}>{children}</GameDetailsCacheContext.Provider>
  );
}

export function useGameDetailsCache() {
  const ctx = useContext(GameDetailsCacheContext);
  if (!ctx) {
    throw new Error('useGameDetailsCache must be used within a GameDetailsCacheProvider');
  }
  return ctx;
}

function enforceCacheLimit(entries: CacheState) {
  const keys = Object.keys(entries);
  if (keys.length <= CACHE_LIMIT) {
    return entries;
  }
  const sortedKeys = keys
    .sort((a, b) => entries[b].timestamp - entries[a].timestamp)
    .slice(0, CACHE_LIMIT);
  return sortedKeys.reduce<CacheState>((acc, key) => {
    acc[key] = entries[key];
    return acc;
  }, {});
}

function parseStoredCache(payload: string): CacheState {
  try {
    const raw = JSON.parse(payload);
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    const now = Date.now();
    return Object.entries(raw as Record<string, Partial<CacheEntry>>).reduce<CacheState>(
      (acc, [key, value]) => {
        if (
          !value ||
          typeof value !== 'object' ||
          typeof value.timestamp !== 'number' ||
          !value.details ||
          !value.similar
        ) {
          return acc;
        }
        if (now - value.timestamp > CACHE_TTL_MS) {
          return acc;
        }
        acc[key] = {
          details: value.details as GameDetailsData,
          similar: Array.isArray(value.similar) ? (value.similar as GameSummary[]) : [],
          timestamp: value.timestamp,
        };
        return acc;
      },
      {},
    );
  } catch (error) {
    console.warn('Failed to parse game details cache', error);
    return {};
  }
}