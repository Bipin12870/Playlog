import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type SearchHistoryItem = {
  id: string;
  term: string;
  createdAt: string;
};

const STORAGE_KEY = 'search_history_v1';
const HISTORY_LIMIT = 50;
const SUGGESTION_LIMIT = 5;

let sharedHistory: SearchHistoryItem[] = [];
let hasHydrated = false;
let hydrationPromise: Promise<void> | null = null;
let pendingWritesBeforeHydration = false;
const subscribers = new Set<() => void>();

export function useSearchHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    hydrateHistory();
  }, []);

  const addEntry = useCallback((rawTerm: string) => {
    const normalized = normalizeTerm(rawTerm);
    if (!normalized) return;
    updateHistory((current) => {
      const timestamp = new Date().toISOString();
      const normalizedKey = normalized.toLowerCase();
      const existingIndex = current.findIndex((item) => item.term.toLowerCase() === normalizedKey);
      if (existingIndex >= 0) {
        const existing = current[existingIndex];
        const updated: SearchHistoryItem = {
          ...existing,
          term: normalized,
          createdAt: timestamp,
        };
        return [updated, ...current.slice(0, existingIndex), ...current.slice(existingIndex + 1)];
      }
      const nextEntry: SearchHistoryItem = {
        id: createHistoryId(),
        term: normalized,
        createdAt: timestamp,
      };
      return [nextEntry, ...current];
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    updateHistory((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    updateHistory(() => []);
  }, []);

  const filterByPrefix = useCallback(
    (rawPrefix: string) => {
      const prefix = normalizePrefix(rawPrefix);
      if (!prefix) return [];
      return history
        .filter((item) => item.term.toLowerCase().startsWith(prefix))
        .slice(0, SUGGESTION_LIMIT);
    },
    [history],
  );

  return {
    history,
    addEntry,
    removeEntry,
    clearHistory,
    filterByPrefix,
  };
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshot() {
  return sharedHistory;
}

function emit(next: SearchHistoryItem[]) {
  sharedHistory = next;
  subscribers.forEach((listener) => listener());
}

function updateHistory(updater: (current: SearchHistoryItem[]) => SearchHistoryItem[]) {
  const next = enforceLimit(updater(sharedHistory));
  emit(next);
  if (hasHydrated) {
    persistHistory(next);
  } else {
    pendingWritesBeforeHydration = true;
  }
}

async function hydrateHistory() {
  if (hasHydrated || hydrationPromise) {
    await hydrationPromise;
    return;
  }

  hydrationPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = parseHistoryPayload(stored);
      if (!parsed.length) return;
      if (pendingWritesBeforeHydration && sharedHistory.length) {
        emit(mergeHistories(parsed, sharedHistory));
      } else {
        emit(parsed);
      }
    } catch (error) {
      console.warn('Failed to load search history', error);
    } finally {
      hasHydrated = true;
      pendingWritesBeforeHydration = false;
      hydrationPromise = null;
      persistHistory(sharedHistory);
    }
  })();

  await hydrationPromise;
}

function persistHistory(items: SearchHistoryItem[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((error) => {
    console.warn('Failed to persist search history', error);
  });
}

function parseHistoryPayload(payload: string): SearchHistoryItem[] {
  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return enforceLimit(
      parsed
        .map((entry) => normalizeStoredEntry(entry))
        .filter((entry): entry is SearchHistoryItem => Boolean(entry)),
    );
  } catch (error) {
    console.warn('Failed to parse search history', error);
    return [];
  }
}

function mergeHistories(base: SearchHistoryItem[], pending: SearchHistoryItem[]) {
  const result = [...pending];
  base.forEach((entry) => {
    const match = result.find((item) => item.term.toLowerCase() === entry.term.toLowerCase());
    if (!match) {
      result.push(entry);
    }
  });
  return enforceLimit(result);
}

function normalizeStoredEntry(entry: unknown): SearchHistoryItem | null {
  if (!entry || typeof entry !== 'object') return null;
  const candidate = entry as Partial<SearchHistoryItem>;
  if (typeof candidate.id !== 'string' || typeof candidate.term !== 'string') {
    return null;
  }
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
  return {
    id: candidate.id,
    term: candidate.term,
    createdAt,
  };
}

function normalizeTerm(term: string) {
  return term.trim();
}

function normalizePrefix(prefix: string) {
  return prefix.trim().toLowerCase();
}

function enforceLimit(items: SearchHistoryItem[]) {
  return items.slice(0, HISTORY_LIMIT);
}

function createHistoryId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
