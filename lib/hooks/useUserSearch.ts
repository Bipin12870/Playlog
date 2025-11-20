import { useEffect, useMemo, useRef, useState } from 'react';

import { searchUsersByUsername } from '../follows';
import type { FollowUserSummary } from '../../types/follow';

type UseUserSearchOptions = {
  limit?: number;
  excludeUid?: string | null;
  excludeUids?: string[];
  minimumLength?: number;
  debounceMs?: number;
};

const DEFAULT_OPTIONS: Required<Pick<UseUserSearchOptions, 'limit' | 'minimumLength' | 'debounceMs'>> =
  {
    limit: 20,
    minimumLength: 2,
    debounceMs: 250,
  };

export function useUserSearch(
  query: string,
  options?: UseUserSearchOptions,
) {
  const [results, setResults] = useState<FollowUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeRequest = useRef<number>(0);

  const mergedOptions = {
    limit: options?.limit ?? DEFAULT_OPTIONS.limit,
    minimumLength: options?.minimumLength ?? DEFAULT_OPTIONS.minimumLength,
    debounceMs: options?.debounceMs ?? DEFAULT_OPTIONS.debounceMs,
    excludeUid: options?.excludeUid ?? null,
    excludeUids: Array.isArray(options?.excludeUids) ? options.excludeUids : [],
  };

  const { limit, minimumLength, debounceMs, excludeUid, excludeUids } = mergedOptions;
  const excludeUidsKey = excludeUids.join(',');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minimumLength) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const requestId = activeRequest.current + 1;
    activeRequest.current = requestId;
    setLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const data = await searchUsersByUsername(trimmed, {
          limit,
          excludeUid: excludeUid ?? undefined,
          excludeUids,
        });
        if (cancelled || activeRequest.current !== requestId) {
          return;
        }
        setResults(data);
      } catch (err) {
        if (cancelled || activeRequest.current !== requestId) {
          return;
        }
        const errorInstance =
          err instanceof Error ? err : new Error('Failed to search users.');
        setError(errorInstance);
        setResults([]);
      } finally {
        if (!cancelled && activeRequest.current === requestId) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, limit, minimumLength, debounceMs, excludeUid, excludeUidsKey]);

  return useMemo(
    () => ({
      results,
      loading,
      error,
      hasResults: results.length > 0,
    }),
    [results, loading, error],
  );
}
