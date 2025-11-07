import { useEffect, useMemo, useState } from 'react';
import type { FirestoreError, QuerySnapshot } from 'firebase/firestore';

import { subscribeToFollowRequests, type FollowListOptions } from '../follows';
import type { FollowEdge } from '../../types/follow';

type FollowRequestState = {
  requests: FollowEdge[];
  loading: boolean;
  error: FirestoreError | Error | null;
  snapshot: QuerySnapshot | null;
};

export function useFollowRequests(uid?: string | null, options?: FollowListOptions) {
  const [state, setState] = useState<FollowRequestState>({
    requests: [],
    loading: false,
    error: null,
    snapshot: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({
        requests: [],
        loading: false,
        error: null,
        snapshot: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const unsubscribe = subscribeToFollowRequests(
      uid,
      (edges, snapshot) => {
        setState({
          requests: edges,
          loading: false,
          error: null,
          snapshot,
        });
      },
      (firestoreError) => {
        setState({
          requests: [],
          loading: false,
          error: firestoreError,
          snapshot: null,
        });
      },
      options,
    );

    return unsubscribe;
  }, [uid, options?.pageSize, options?.cursor]);

  return useMemo(
    () => ({
      requests: state.requests,
      loading: state.loading,
      error: state.error,
      snapshot: state.snapshot,
    }),
    [state.requests, state.loading, state.error, state.snapshot],
  );
}
