import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { cancelFollowRequest, followUser, unfollowUser } from '../follows';
import { auth, db } from '../firebase';

type UseFollowStateArgs = {
  currentUid?: string | null;
  targetUid?: string | null;
};

export function useFollowState({ currentUid, targetUid }: UseFollowStateArgs) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | FirestoreError | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      setIsFollowing(false);
      setHasPendingRequest(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const followRef = doc(
      db,
      'userRelationships',
      currentUid,
      'following',
      targetUid,
    );

    const unsubscribe = onSnapshot(
      followRef,
      (snapshot) => {
        setIsFollowing(snapshot.exists());
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setIsFollowing(false);
        setLoading(false);
        setError(snapshotError);
      },
    );

    return unsubscribe;
  }, [currentUid, targetUid]);

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      setHasPendingRequest(false);
      setIsBlocked(false);
      setIsBlockedBy(false);
      return;
    }

    const requestRef = doc(
      db,
      'userRelationships',
      currentUid,
      'followRequestsSent',
      targetUid,
    );

    const unsubscribe = onSnapshot(
      requestRef,
      (snapshot) => {
        setHasPendingRequest(snapshot.exists());
      },
      () => {
        setHasPendingRequest(false);
      },
    );

    return unsubscribe;
  }, [currentUid, targetUid]);

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      setIsBlocked(false);
      return;
    }

    const blockRef = doc(db, 'userRelationships', currentUid, 'blocked', targetUid);
    const unsubscribe = onSnapshot(
      blockRef,
      (snapshot) => {
        setIsBlocked(snapshot.exists());
      },
      () => {
        setIsBlocked(false);
      },
    );

    return unsubscribe;
  }, [currentUid, targetUid]);

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      setIsBlockedBy(false);
      return;
    }

    const blockedByRef = doc(db, 'userRelationships', currentUid, 'blockedBy', targetUid);
    const unsubscribe = onSnapshot(
      blockedByRef,
      (snapshot) => {
        setIsBlockedBy(snapshot.exists());
      },
      () => {
        setIsBlockedBy(false);
      },
    );

    return unsubscribe;
  }, [currentUid, targetUid]);

  const follow = useCallback(async () => {
    if (!targetUid || !currentUid || currentUid === targetUid) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await followUser(targetUid);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('FOLLOW_FAILED');
      setError(errorInstance);
    } finally {
      setProcessing(false);
    }
  }, [currentUid, targetUid]);

  const unfollow = useCallback(async () => {
    if (!targetUid || !currentUid || currentUid === targetUid) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await unfollowUser(targetUid);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('UNFOLLOW_FAILED');
      setError(errorInstance);
    } finally {
      setProcessing(false);
    }
  }, [currentUid, targetUid]);

  const cancelRequest = useCallback(async () => {
    if (!targetUid || !currentUid || currentUid === targetUid) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await cancelFollowRequest(targetUid);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('CANCEL_REQUEST_FAILED');
      setError(errorInstance);
    } finally {
      setProcessing(false);
    }
  }, [currentUid, targetUid]);

  const toggle = useCallback(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) {
      return;
    }
    if (isFollowing) {
      void unfollow();
    } else if (hasPendingRequest) {
      void cancelRequest();
    } else {
      void follow();
    }
  }, [currentUid, targetUid, isFollowing, hasPendingRequest, follow, unfollow, cancelRequest]);

  return useMemo(
    () => ({
      isFollowing,
      isBlocked,
      isBlockedBy,
      hasPendingRequest,
      loading,
      error,
      processing,
      canFollow:
        !!targetUid &&
        !!(currentUid ?? auth.currentUser?.uid) &&
        !isBlocked &&
        !isBlockedBy &&
        targetUid !== (currentUid ?? auth.currentUser?.uid),
      follow,
      unfollow,
      cancelRequest,
      toggle,
    }),
    [
      isFollowing,
      hasPendingRequest,
      isBlocked,
      isBlockedBy,
      loading,
      error,
      processing,
      targetUid,
      currentUid,
      follow,
      unfollow,
      cancelRequest,
      toggle,
    ],
  );
}
