import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { blockUser, unblockUser } from '../follows';

type UseBlockStateArgs = {
  currentUid?: string | null;
  targetUid?: string | null;
};

export function useBlockState({ currentUid, targetUid }: UseBlockStateArgs) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | FirestoreError | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      setIsBlocked(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const blockRef = doc(db, 'userRelationships', currentUid, 'blocked', targetUid);

    const unsubscribe = onSnapshot(
      blockRef,
      (snapshot) => {
        setIsBlocked(snapshot.exists());
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setIsBlocked(false);
        setLoading(false);
        setError(snapshotError);
      },
    );

    return unsubscribe;
  }, [currentUid, targetUid]);

  const block = useCallback(async () => {
    if (!targetUid || !currentUid || currentUid === targetUid) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await blockUser(targetUid);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('BLOCK_FAILED');
      setError(errorInstance);
    } finally {
      setProcessing(false);
    }
  }, [currentUid, targetUid]);

  const unblock = useCallback(async () => {
    if (!targetUid || !currentUid || currentUid === targetUid) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await unblockUser(targetUid);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('UNBLOCK_FAILED');
      setError(errorInstance);
    } finally {
      setProcessing(false);
    }
  }, [currentUid, targetUid]);

  return useMemo(
    () => ({
      isBlocked,
      loading,
      processing,
      error,
      canBlock:
        !!targetUid &&
        !!(currentUid ?? auth.currentUser?.uid) &&
        targetUid !== (currentUid ?? auth.currentUser?.uid),
      block,
      unblock,
    }),
    [isBlocked, loading, processing, error, targetUid, currentUid, block, unblock],
  );
}
