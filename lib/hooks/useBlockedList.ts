import { useEffect, useMemo, useState } from 'react';
import type { FirestoreError, QuerySnapshot } from 'firebase/firestore';

import { subscribeToBlockedList, type FollowListOptions } from '../follows';
import type { FollowEdge } from '../../types/follow';

type BlockedListState = {
  edges: FollowEdge[];
  loading: boolean;
  error: FirestoreError | Error | null;
  snapshot: QuerySnapshot | null;
};

export function useBlockedUsers(uid?: string | null, options?: FollowListOptions) {
  const [state, setState] = useState<BlockedListState>({
    edges: [],
    loading: false,
    error: null,
    snapshot: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({
        edges: [],
        loading: false,
        error: null,
        snapshot: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const unsubscribe = subscribeToBlockedList(
      uid,
      (edges, snapshot) => {
        setState({
          edges,
          loading: false,
          error: null,
          snapshot,
        });
      },
      (firestoreError) => {
        setState({
          edges: [],
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
      edges: state.edges,
      loading: state.loading,
      error: state.error,
      snapshot: state.snapshot,
    }),
    [state.edges, state.loading, state.error, state.snapshot],
  );
}
