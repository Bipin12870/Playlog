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

import type { GameSummary } from '../../types/game';

export type SearchScope = 'games' | 'favourites' | 'friends';

type ScopeState = {
  term: string;
  submittedTerm: string;
  submissionId: number;
};

type GameSearchContextValue = {
  scope: SearchScope;
  setScope: (scope: SearchScope) => void;
  term: string;
  setTerm: (value: string) => void;
  submittedTerm: string;
  submissionId: number;
  submit: (value?: string) => void;
  resetSearch: () => void;
  cacheReady: boolean;
  getCachedResults: (term: string) => GameSummary[] | null;
  cacheResults: (term: string, games: GameSummary[]) => void;
};

const DEFAULT_SCOPE_STATE: ScopeState = {
  term: '',
  submittedTerm: '',
  submissionId: 0,
};

const CACHE_STORAGE_KEY = 'playlog:game-search-cache';
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const CACHE_LIMIT = 20;

type SearchCacheEntry = {
  data: GameSummary[];
  timestamp: number;
};

type SearchCache = Record<string, SearchCacheEntry>;

const INITIAL_STATE: Record<SearchScope, ScopeState> = {
  games: { ...DEFAULT_SCOPE_STATE },
  favourites: { ...DEFAULT_SCOPE_STATE },
  friends: { ...DEFAULT_SCOPE_STATE },
};

const GameSearchContext = createContext<GameSearchContextValue | undefined>(undefined);

export function GameSearchProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<SearchScope>('games');
  const [scopes, setScopes] = useState<Record<SearchScope, ScopeState>>(INITIAL_STATE);
  const [cache, setCache] = useState<SearchCache>({});
  const [cacheReady, setCacheReady] = useState(false);
  const cacheRef = useRef<SearchCache>(cache);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    let cancelled = false;
    const loadCache = async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
        if (cancelled || !stored) return;
        const parsed = parseStoredCache(stored);
        if (Object.keys(parsed).length) {
          setCache((prev) => ({
            ...parsed,
            ...prev,
          }));
        }
      } catch (error) {
        console.warn('Failed to load search cache', error);
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
    AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache)).catch((error) => {
      console.warn('Failed to persist search cache', error);
    });
  }, [cache, cacheReady]);

  const setTerm = useCallback((value: string) => {
    setScopes((prev) => {
      const current = prev[scope];
      return {
        ...prev,
        [scope]: {
          ...current,
          term: value,
        },
      };
    });
  }, [scope]);

  const submit = useCallback(
    (value?: string) => {
      setScopes((prev) => {
        const current = prev[scope];
        const nextValue = value?.trim() ?? current.term.trim();
        if (!nextValue) {
          return {
            ...prev,
            [scope]: {
              term: '',
              submittedTerm: '',
              submissionId: current.submissionId + 1,
            },
          };
        }
        return {
          ...prev,
          [scope]: {
            term: nextValue,
            submittedTerm: nextValue,
            submissionId: current.submissionId + 1,
          },
        };
      });
    },
    [scope],
  );

  const resetSearch = useCallback(() => {
    setScopes((prev) => {
      const current = prev[scope];
      return {
        ...prev,
        [scope]: {
          term: '',
          submittedTerm: '',
          submissionId: current.submissionId + 1,
        },
      };
    });
  }, [scope]);

  const getCachedResults = useCallback((term: string) => {
    const normalized = normalizeTerm(term);
    if (!normalized) return null;
    const entry = cacheRef.current[normalized];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return entry.data;
  }, []);

  const cacheResults = useCallback((term: string, games: GameSummary[]) => {
    const normalized = normalizeTerm(term);
    if (!normalized) return;
    setCache((prev) => {
      const next: SearchCache = {
        ...prev,
        [normalized]: {
          data: games,
          timestamp: Date.now(),
        },
      };
      return enforceCacheLimit(next);
    });
  }, []);

  const value = useMemo(() => {
    const current = scopes[scope];
    return {
      scope,
      setScope,
      term: current.term,
      setTerm,
      submittedTerm: current.submittedTerm,
      submissionId: current.submissionId,
      submit,
      resetSearch,
      cacheReady,
      getCachedResults,
      cacheResults,
    };
  }, [scope, scopes, setTerm, submit, resetSearch, cacheReady, getCachedResults, cacheResults]);

  return <GameSearchContext.Provider value={value}>{children}</GameSearchContext.Provider>;
}

export function useGameSearch() {
  const ctx = useContext(GameSearchContext);
  if (!ctx) {
    throw new Error('useGameSearch must be used within a GameSearchProvider');
  }
  return ctx;
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function enforceCacheLimit(entries: SearchCache) {
  const keys = Object.keys(entries);
  if (keys.length <= CACHE_LIMIT) {
    return entries;
  }
  const sortedKeys = keys
    .sort((a, b) => entries[b].timestamp - entries[a].timestamp)
    .slice(0, CACHE_LIMIT);
  return sortedKeys.reduce<SearchCache>((acc, key) => {
    acc[key] = entries[key];
    return acc;
  }, {});
}

function parseStoredCache(payload: string): SearchCache {
  try {
    const raw = JSON.parse(payload);
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    const now = Date.now();
    return Object.entries(raw as Record<string, Partial<SearchCacheEntry>>).reduce<SearchCache>(
      (acc, [key, value]) => {
        if (
          !value ||
          typeof value !== 'object' ||
          typeof value.timestamp !== 'number' ||
          !Array.isArray(value.data)
        ) {
          return acc;
        }
        if (now - value.timestamp > CACHE_TTL_MS) {
          return acc;
        }
        acc[key] = {
          data: value.data as GameSummary[],
          timestamp: value.timestamp,
        };
        return acc;
      },
      {},
    );
  } catch (error) {
    console.warn('Failed to parse search cache', error);
    return {};
  }
}