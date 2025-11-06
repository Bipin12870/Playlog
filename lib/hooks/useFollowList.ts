import { useEffect, useMemo, useState } from 'react';
import type { FirestoreError, QuerySnapshot } from 'firebase/firestore';

import { subscribeToFollowList, type FollowListOptions } from '../follows';
import type { FollowEdge } from '../../types/follow';

type FollowListState = {
  edges: FollowEdge[];
  loading: boolean;
  error: FirestoreError | Error | null;
  snapshot: QuerySnapshot | null;
};

function useFollowList(uid: string | null | undefined, mode: 'followers' | 'following', options?: FollowListOptions) {
  const [state, setState] = useState<FollowListState>({
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

    const unsubscribe = subscribeToFollowList(
      uid,
      mode,
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
  }, [uid, mode, options?.pageSize, options?.cursor]);

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

export function useFollowers(uid?: string | null, options?: FollowListOptions) {
  return useFollowList(uid, 'followers', options);
}

export function useFollowing(uid?: string | null, options?: FollowListOptions) {
  return useFollowList(uid, 'following', options);
}
