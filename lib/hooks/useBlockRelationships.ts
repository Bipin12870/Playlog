import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { db } from '../firebase';

type BlockRelationshipsState = {
  blockedIds: string[];
  blockedByIds: string[];
  loading: boolean;
  error: FirestoreError | Error | null;
};

function buildInitialState(): BlockRelationshipsState {
  return {
    blockedIds: [],
    blockedByIds: [],
    loading: false,
    error: null,
  };
}

export function useBlockRelationships(uid?: string | null) {
  const [state, setState] = useState<BlockRelationshipsState>(() => buildInitialState());

  useEffect(() => {
    if (!uid) {
      setState(buildInitialState());
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    let blockedReady = false;
    let blockedByReady = false;
    let unsubscribed = false;

    const finishIfReady = () => {
      if (!blockedReady || !blockedByReady) {
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    };

    const blockedRef = collection(db, 'userRelationships', uid, 'blocked');
    const blockedByRef = collection(db, 'userRelationships', uid, 'blockedBy');

    const unsubscribeBlocked = onSnapshot(
      blockedRef,
      (snapshot) => {
        if (unsubscribed) return;
        blockedReady = true;
        setState((prev) => ({
          ...prev,
          blockedIds: snapshot.docs.map((docSnap) => docSnap.id),
          error: null,
        }));
        finishIfReady();
      },
      (snapshotError) => {
        if (unsubscribed) return;
        blockedReady = true;
        setState((prev) => ({
          ...prev,
          blockedIds: [],
          error: snapshotError,
        }));
        finishIfReady();
      },
    );

    const unsubscribeBlockedBy = onSnapshot(
      blockedByRef,
      (snapshot) => {
        if (unsubscribed) return;
        blockedByReady = true;
        setState((prev) => ({
          ...prev,
          blockedByIds: snapshot.docs.map((docSnap) => docSnap.id),
          error: null,
        }));
        finishIfReady();
      },
      (snapshotError) => {
        if (unsubscribed) return;
        blockedByReady = true;
        setState((prev) => ({
          ...prev,
          blockedByIds: [],
          error: snapshotError,
        }));
        finishIfReady();
      },
    );

    return () => {
      unsubscribed = true;
      unsubscribeBlocked();
      unsubscribeBlockedBy();
    };
  }, [uid]);

  return useMemo(() => {
    const blockedSet = new Set(state.blockedIds);
    const blockedBySet = new Set(state.blockedByIds);
    const combinedBlockedIds = Array.from(new Set([...state.blockedIds, ...state.blockedByIds])).sort();

    const isBlocking = (targetUid?: string | null) => {
      if (!targetUid) return false;
      return blockedSet.has(targetUid);
    };

    const isBlockedBy = (targetUid?: string | null) => {
      if (!targetUid) return false;
      return blockedBySet.has(targetUid);
    };

    return {
      blockedIds: state.blockedIds,
      blockedByIds: state.blockedByIds,
      combinedBlockedIds,
      loading: state.loading,
      error: state.error,
      isBlocking,
      isBlockedBy,
    };
  }, [state.blockedIds, state.blockedByIds, state.loading, state.error]);
}
