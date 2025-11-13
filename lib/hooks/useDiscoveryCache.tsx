import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { GameSummary } from '../../types/game';

type DiscoveryPayload = {
  featured: GameSummary[];
  liked: GameSummary[];
  recommended: GameSummary[];
};

type CacheEntry = {
  payload: DiscoveryPayload;
  timestamp: number;
};

type DiscoveryCacheContextValue = {
  cacheReady: boolean;
  getCachedDiscovery: () => DiscoveryPayload | null;
  cacheDiscovery: (payload: DiscoveryPayload) => void;
  clearDiscoveryCache: () => void;
};

const CACHE_KEY = 'playlog:discovery-cache';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

const DiscoveryCacheContext = createContext<DiscoveryCacheContextValue | undefined>(undefined);

export function DiscoveryCacheProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<CacheEntry | null>(null);
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadCache = async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (cancelled || !stored) return;
        const parsed = parseStoredCache(stored);
        if (parsed) {
          setEntry(parsed);
        }
      } catch (error) {
        console.warn('Failed to load discovery cache', error);
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
    if (!entry) {
      AsyncStorage.removeItem(CACHE_KEY).catch((error) => {
        console.warn('Failed to clear discovery cache storage', error);
      });
      return;
    }
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch((error) => {
      console.warn('Failed to persist discovery cache', error);
    });
  }, [entry, cacheReady]);

  const getCachedDiscovery = useCallback(() => {
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return entry.payload;
  }, [entry]);

  const cacheDiscovery = useCallback((payload: DiscoveryPayload) => {
    setEntry({
      payload: clonePayload(payload),
      timestamp: Date.now(),
    });
  }, []);

  const clearDiscoveryCache = useCallback(() => {
    setEntry(null);
  }, []);

  const value = useMemo(
    () => ({
      cacheReady,
      getCachedDiscovery,
      cacheDiscovery,
      clearDiscoveryCache,
    }),
    [cacheReady, getCachedDiscovery, cacheDiscovery, clearDiscoveryCache],
  );

  return <DiscoveryCacheContext.Provider value={value}>{children}</DiscoveryCacheContext.Provider>;
}

export function useDiscoveryCache() {
  const ctx = useContext(DiscoveryCacheContext);
  if (!ctx) {
    throw new Error('useDiscoveryCache must be used within a DiscoveryCacheProvider');
  }
  return ctx;
}

function parseStoredCache(payload: string): CacheEntry | null {
  try {
    const parsed = JSON.parse(payload);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.timestamp !== 'number' ||
      typeof parsed.payload !== 'object'
    ) {
      return null;
    }
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      return null;
    }
    const payloadValue = parsed.payload as Partial<DiscoveryPayload>;
    return {
      timestamp: parsed.timestamp,
      payload: {
        featured: Array.isArray(payloadValue.featured) ? payloadValue.featured : [],
        liked: Array.isArray(payloadValue.liked) ? payloadValue.liked : [],
        recommended: Array.isArray(payloadValue.recommended) ? payloadValue.recommended : [],
      },
    };
  } catch (error) {
    console.warn('Failed to parse discovery cache', error);
    return null;
  }
}

function clonePayload(payload: DiscoveryPayload): DiscoveryPayload {
  return {
    featured: [...payload.featured],
    liked: [...payload.liked],
    recommended: [...payload.recommended],
  };
}
