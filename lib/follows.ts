import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  startAt,
  endAt,
  type DocumentSnapshot,
  type FirestoreError,
  type QueryConstraint,
  type QuerySnapshot,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import type { FollowEdge, FollowUserSummary } from '../types/follow';
import { createNotification } from './notifications';

const RELATIONSHIPS_COLLECTION = 'userRelationships';
const FOLLOWING_COLLECTION = 'following';
const FOLLOWERS_COLLECTION = 'followers';
const BLOCKED_COLLECTION = 'blocked';
const BLOCKED_BY_COLLECTION = 'blockedBy';
const FOLLOW_REQUESTS_COLLECTION = 'followRequests';
const FOLLOW_REQUESTS_SENT_COLLECTION = 'followRequestsSent';

function userRelationshipsDoc(uid: string) {
  return doc(db, RELATIONSHIPS_COLLECTION, uid);
}

function followingCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), FOLLOWING_COLLECTION);
}

function followersCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), FOLLOWERS_COLLECTION);
}

function blockedCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), BLOCKED_COLLECTION);
}

function blockedByCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), BLOCKED_BY_COLLECTION);
}

function followRequestsCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), FOLLOW_REQUESTS_COLLECTION);
}

function followRequestsSentCollection(uid: string) {
  return collection(userRelationshipsDoc(uid), FOLLOW_REQUESTS_SENT_COLLECTION);
}

function followingDoc(sourceUid: string, targetUid: string) {
  return doc(followingCollection(sourceUid), targetUid);
}

function followerDoc(targetUid: string, sourceUid: string) {
  return doc(followersCollection(targetUid), sourceUid);
}

function blockedDoc(sourceUid: string, targetUid: string) {
  return doc(blockedCollection(sourceUid), targetUid);
}

function blockedByDoc(targetUid: string, sourceUid: string) {
  return doc(blockedByCollection(targetUid), sourceUid);
}

function followRequestDoc(targetUid: string, sourceUid: string) {
  return doc(followRequestsCollection(targetUid), sourceUid);
}

function followRequestSentDoc(sourceUid: string, targetUid: string) {
  return doc(followRequestsSentCollection(sourceUid), targetUid);
}

export function mapSummaryFromProfile(uid: string, data: any): FollowUserSummary {
  return {
    uid,
    displayName: data?.displayName ?? 'Anonymous',
    username: data?.username ?? null,
    photoURL: data?.photoURL ?? null,
    avatarKey: data?.avatarKey ?? null,
    bio: data?.bio ?? null,
  };
}

export function mapFollowDocument(snapshot: DocumentSnapshot): FollowEdge {
  const data = snapshot.data() || {};
  const followedAt =
    data?.followedAt instanceof Timestamp ? data.followedAt.toDate().toISOString() : null;
  const requestedAt =
    data?.requestedAt instanceof Timestamp ? data.requestedAt.toDate().toISOString() : null;

  return {
    uid: data?.uid ?? snapshot.id,
    displayName: data?.displayName ?? 'Anonymous',
    username: data?.username ?? null,
    photoURL: data?.photoURL ?? null,
    avatarKey: data?.avatarKey ?? null,
    bio: data?.bio ?? null,
    followedAt,
    mutual: typeof data?.mutual === 'boolean' ? data.mutual : null,
    requestedAt,
  };
}

export type FollowListOptions = {
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
};

export function buildFollowListQuery(uid: string, mode: 'followers' | 'following', opts?: FollowListOptions) {
  const baseCollection = mode === 'followers' ? followersCollection(uid) : followingCollection(uid);
  const constraints: QueryConstraint[] = [orderBy('followedAt', 'desc')];
  if (typeof opts?.pageSize === 'number') {
    constraints.push(limit(opts.pageSize));
  }
  if (opts?.cursor) {
    constraints.push(startAfter(opts.cursor));
  }
  return query(baseCollection, ...constraints);
}

export function fetchFollowList(uid: string, mode: 'followers' | 'following', opts?: FollowListOptions) {
  const followQuery = buildFollowListQuery(uid, mode, opts);
  return getDocs(followQuery);
}

export function subscribeToFollowList(
  uid: string,
  mode: 'followers' | 'following',
  callback: (edges: FollowEdge[], snapshot: QuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  opts?: FollowListOptions,
) {
  const followQuery = buildFollowListQuery(uid, mode, opts);
  return onSnapshot(
    followQuery,
    (snapshot) => {
      const edges = snapshot.docs.map(mapFollowDocument);
      callback(edges, snapshot);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn(`Failed to subscribe to ${mode}`, error);
      }
    },
  );
}

export function buildBlockedListQuery(uid: string, opts?: FollowListOptions) {
  const baseCollection = blockedCollection(uid);
  const constraints: QueryConstraint[] = [orderBy('blockedAt', 'desc')];
  if (typeof opts?.pageSize === 'number') {
    constraints.push(limit(opts.pageSize));
  }
  if (opts?.cursor) {
    constraints.push(startAfter(opts.cursor));
  }
  return query(baseCollection, ...constraints);
}

export function subscribeToBlockedList(
  uid: string,
  callback: (edges: FollowEdge[], snapshot: QuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  opts?: FollowListOptions,
) {
  const blockedQuery = buildBlockedListQuery(uid, opts);
  return onSnapshot(
    blockedQuery,
    (snapshot) => {
      const edges = snapshot.docs.map(mapFollowDocument);
      callback(edges, snapshot);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to blocked users', error);
      }
    },
  );
}

type SearchUsersOptions = {
  limit?: number;
  excludeUid?: string;
  excludeUids?: string[];
};

export async function searchUsersByUsername(
  term: string,
  opts?: SearchUsersOptions,
): Promise<FollowUserSummary[]> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const usersRef = collection(db, 'users');
  const constraints: QueryConstraint[] = [
    orderBy('normalizedUsername'),
    startAt(normalized),
    endAt(`${normalized}\uf8ff`),
    limit(opts?.limit ?? 20),
  ];

  const snapshot = await getDocs(query(usersRef, ...constraints));
  const excluded = new Set<string>();
  if (opts?.excludeUid) {
    excluded.add(opts.excludeUid);
  }
  if (Array.isArray(opts?.excludeUids)) {
    opts.excludeUids.forEach((uid) => {
      if (typeof uid === 'string' && uid.length) {
        excluded.add(uid);
      }
    });
  }

  return snapshot.docs
    .map((docSnap) => mapSummaryFromProfile(docSnap.id, docSnap.data()))
    .filter((summary) => !excluded.has(summary.uid));
}

export async function followUser(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const sourceUid = currentUser.uid;
  if (!targetUid || targetUid === sourceUid) {
    throw new Error('INVALID_TARGET');
  }

  const sourceUserRef = doc(db, 'users', sourceUid);
  const targetUserRef = doc(db, 'users', targetUid);
  const followingRef = followingDoc(sourceUid, targetUid);
  const followerRef = followerDoc(targetUid, sourceUid);
  const incomingRequestRef = followRequestDoc(targetUid, sourceUid);
  const outgoingRequestRef = followRequestSentDoc(sourceUid, targetUid);
  const sourceBlockedRef = blockedDoc(sourceUid, targetUid);
  const targetBlockedRef = blockedDoc(targetUid, sourceUid);

  let notificationTarget: string | null = null;
  let notificationType: 'friend_request' | 'new_follower' | null = null;
  let notificationMessage: string | null = null;

  await runTransaction(db, async (transaction) => {
    const [
      sourceSnapshot,
      targetSnapshot,
      followingSnapshot,
      incomingRequestSnapshot,
      outgoingRequestSnapshot,
      sourceBlockedSnapshot,
      targetBlockedSnapshot,
    ] = await Promise.all([
      transaction.get(sourceUserRef),
      transaction.get(targetUserRef),
      transaction.get(followingRef),
      transaction.get(incomingRequestRef),
      transaction.get(outgoingRequestRef),
      transaction.get(sourceBlockedRef),
      transaction.get(targetBlockedRef),
    ]);

    if (!targetSnapshot.exists()) {
      throw new Error('TARGET_NOT_FOUND');
    }
    if (!sourceSnapshot.exists()) {
      throw new Error('PROFILE_MISSING');
    }
    if (sourceBlockedSnapshot.exists()) {
      throw new Error('FOLLOW_BLOCKED_TARGET');
    }
    if (targetBlockedSnapshot.exists()) {
      throw new Error('FOLLOW_BLOCKED_BY_TARGET');
    }

    const targetVisibility =
      typeof targetSnapshot.data()?.profileVisibility === 'string'
        ? targetSnapshot.data()?.profileVisibility
        : 'public';

    if (targetVisibility === 'private' && !followingSnapshot.exists()) {
      if (incomingRequestSnapshot.exists()) {
        return;
      }

      const now = serverTimestamp();
      const sourceSummary = mapSummaryFromProfile(sourceUid, sourceSnapshot.data());
      const targetSummary = mapSummaryFromProfile(targetUid, targetSnapshot.data());

      transaction.set(
        incomingRequestRef,
        {
          ...sourceSummary,
          requestedAt: now,
          status: 'pending',
        },
        { merge: true },
      );

      transaction.set(
        outgoingRequestRef,
        {
          ...targetSummary,
          requestedAt: now,
          status: 'pending',
        },
        { merge: true },
      );
      transaction.update(targetUserRef, { updatedAt: now });
      transaction.update(sourceUserRef, { updatedAt: now });
      notificationTarget = targetUid;
      notificationType = 'friend_request';
      notificationMessage = `${sourceSummary.displayName ?? 'Someone'} sent you a follow request.`;
      return;
    }

    if (followingSnapshot.exists()) {
      return;
    }

    const now = serverTimestamp();
    const sourceSummary = mapSummaryFromProfile(sourceUid, sourceSnapshot.data());
    const targetSummary = mapSummaryFromProfile(targetUid, targetSnapshot.data());

    transaction.set(
      followingRef,
      {
        ...targetSummary,
        followedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      followerRef,
      {
        ...sourceSummary,
        followedAt: now,
      },
      { merge: true },
    );

    if (incomingRequestSnapshot.exists()) {
      transaction.delete(incomingRequestRef);
    }
    if (outgoingRequestSnapshot.exists()) {
      transaction.delete(outgoingRequestRef);
    }

    transaction.update(sourceUserRef, {
      'stats.following': increment(1),
      updatedAt: now,
    });

    transaction.update(targetUserRef, {
      'stats.followers': increment(1),
      updatedAt: now,
    });

    notificationTarget = targetUid;
    notificationType = 'new_follower';
    notificationMessage = `${sourceSummary.displayName ?? 'Someone'} started following you.`;
  });

  if (notificationTarget && notificationType && notificationMessage) {
    try {
      await createNotification(notificationTarget, {
        type: notificationType,
        message: notificationMessage,
        metadata: { userId: sourceUid },
      });
    } catch (err) {
      console.warn('Failed to create notification for follow event', err);
    }
  }
}

export async function unfollowUser(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const sourceUid = currentUser.uid;
  if (!targetUid || targetUid === sourceUid) {
    throw new Error('INVALID_TARGET');
  }

  const sourceUserRef = doc(db, 'users', sourceUid);
  const targetUserRef = doc(db, 'users', targetUid);
  const followingRef = followingDoc(sourceUid, targetUid);
  const followerRef = followerDoc(targetUid, sourceUid);

  await runTransaction(db, async (transaction) => {
    const followingSnapshot = await transaction.get(followingRef);
    if (!followingSnapshot.exists()) {
      return;
    }

    transaction.delete(followingRef);
    transaction.delete(followerRef);

    const now = serverTimestamp();
    transaction.update(sourceUserRef, {
      'stats.following': increment(-1),
      updatedAt: now,
    });

    transaction.update(targetUserRef, {
      'stats.followers': increment(-1),
      updatedAt: now,
    });
  });
}

export async function getFollowStatus(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }
  const followSnapshot = await getDoc(followingDoc(currentUser.uid, targetUid));
  return followSnapshot.exists();
}

export async function blockUser(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const sourceUid = currentUser.uid;
  if (!targetUid || targetUid === sourceUid) {
    throw new Error('INVALID_TARGET');
  }

  const sourceUserRef = doc(db, 'users', sourceUid);
  const targetUserRef = doc(db, 'users', targetUid);
  const blockedRef = blockedDoc(sourceUid, targetUid);
  const blockedByRef = blockedByDoc(targetUid, sourceUid);

  const sourceFollowingRef = followingDoc(sourceUid, targetUid);
  const targetFollowerRef = followerDoc(targetUid, sourceUid);
  const targetFollowingRef = followingDoc(targetUid, sourceUid);
  const sourceFollowerRef = followerDoc(sourceUid, targetUid);
  const sourceIncomingRequestRef = followRequestDoc(sourceUid, targetUid);
  const targetIncomingRequestRef = followRequestDoc(targetUid, sourceUid);
  const sourceOutgoingRequestRef = followRequestSentDoc(sourceUid, targetUid);
  const targetOutgoingRequestRef = followRequestSentDoc(targetUid, sourceUid);

  await runTransaction(db, async (transaction) => {
    const [
      sourceSnapshot,
      targetSnapshot,
      blockedSnapshot,
      sourceFollowingSnapshot,
      targetFollowerSnapshot,
      targetFollowingSnapshot,
      sourceFollowerSnapshot,
      sourceIncomingRequestSnapshot,
      targetIncomingRequestSnapshot,
      sourceOutgoingRequestSnapshot,
      targetOutgoingRequestSnapshot,
    ] = await Promise.all([
      transaction.get(sourceUserRef),
      transaction.get(targetUserRef),
      transaction.get(blockedRef),
      transaction.get(sourceFollowingRef),
      transaction.get(targetFollowerRef),
      transaction.get(targetFollowingRef),
      transaction.get(sourceFollowerRef),
      transaction.get(sourceIncomingRequestRef),
      transaction.get(targetIncomingRequestRef),
      transaction.get(sourceOutgoingRequestRef),
      transaction.get(targetOutgoingRequestRef),
    ]);

    if (!targetSnapshot.exists()) {
      throw new Error('TARGET_NOT_FOUND');
    }
    if (!sourceSnapshot.exists()) {
      throw new Error('PROFILE_MISSING');
    }
    if (blockedSnapshot.exists()) {
      return;
    }

    const now = serverTimestamp();
    const sourceSummary = mapSummaryFromProfile(sourceUid, sourceSnapshot.data());
    const targetSummary = mapSummaryFromProfile(targetUid, targetSnapshot.data());

    transaction.set(
      blockedRef,
      {
        ...targetSummary,
        blockedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      blockedByRef,
      {
        ...sourceSummary,
        blockedAt: now,
      },
      { merge: true },
    );

    let sourceFollowingDelta = 0;
    let sourceFollowersDelta = 0;
    let targetFollowingDelta = 0;
    let targetFollowersDelta = 0;

    if (sourceFollowingSnapshot.exists()) {
      transaction.delete(sourceFollowingRef);
      sourceFollowingDelta -= 1;
      if (targetFollowerSnapshot.exists()) {
        transaction.delete(targetFollowerRef);
        targetFollowersDelta -= 1;
      }
    }

    if (targetFollowingSnapshot.exists()) {
      transaction.delete(targetFollowingRef);
      targetFollowingDelta -= 1;
    }

    if (sourceFollowerSnapshot.exists()) {
      transaction.delete(sourceFollowerRef);
      sourceFollowersDelta -= 1;
      if (!targetFollowingSnapshot.exists()) {
        targetFollowingDelta -= 1;
      }
    }

    if (sourceIncomingRequestSnapshot.exists()) {
      transaction.delete(sourceIncomingRequestRef);
    }
    if (targetIncomingRequestSnapshot.exists()) {
      transaction.delete(targetIncomingRequestRef);
    }
    if (sourceOutgoingRequestSnapshot.exists()) {
      transaction.delete(sourceOutgoingRequestRef);
    }
    if (targetOutgoingRequestSnapshot.exists()) {
      transaction.delete(targetOutgoingRequestRef);
    }

    const sourceUpdate: Record<string, unknown> = {
      updatedAt: now,
      'stats.blocked': increment(1),
    };
    if (sourceFollowingDelta) {
      sourceUpdate['stats.following'] = increment(sourceFollowingDelta);
    }
    if (sourceFollowersDelta) {
      sourceUpdate['stats.followers'] = increment(sourceFollowersDelta);
    }

    const targetUpdate: Record<string, unknown> = {
      updatedAt: now,
    };
    if (targetFollowingDelta) {
      targetUpdate['stats.following'] = increment(targetFollowingDelta);
    }
    if (targetFollowersDelta) {
      targetUpdate['stats.followers'] = increment(targetFollowersDelta);
    }

    transaction.update(sourceUserRef, sourceUpdate);
    transaction.update(targetUserRef, targetUpdate);
  });
}

export async function unblockUser(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const sourceUid = currentUser.uid;
  if (!targetUid || targetUid === sourceUid) {
    throw new Error('INVALID_TARGET');
  }

  const sourceUserRef = doc(db, 'users', sourceUid);
  const blockedRef = blockedDoc(sourceUid, targetUid);
  const blockedByRef = blockedByDoc(targetUid, sourceUid);

  await runTransaction(db, async (transaction) => {
    const blockedSnapshot = await transaction.get(blockedRef);
    if (!blockedSnapshot.exists()) {
      return;
    }
    transaction.delete(blockedRef);
    transaction.delete(blockedByRef);

    const now = serverTimestamp();
    transaction.update(sourceUserRef, {
      updatedAt: now,
      'stats.blocked': increment(-1),
    });
  });
}

export async function getBlockStatus(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }
  const blockSnapshot = await getDoc(blockedDoc(currentUser.uid, targetUid));
  return blockSnapshot.exists();
}

export function buildFollowRequestQuery(uid: string, opts?: FollowListOptions) {
  const baseCollection = followRequestsCollection(uid);
  const constraints: QueryConstraint[] = [orderBy('requestedAt', 'desc'), limit(opts?.pageSize ?? 25)];
  if (opts?.cursor) {
    constraints.push(startAfter(opts.cursor));
  }
  return query(baseCollection, ...constraints);
}

export function subscribeToFollowRequests(
  uid: string,
  callback: (edges: FollowEdge[], snapshot: QuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  opts?: FollowListOptions,
) {
  const requestQuery = buildFollowRequestQuery(uid, opts);
  return onSnapshot(
    requestQuery,
    (snapshot) => {
      const edges = snapshot.docs.map(mapFollowDocument);
      callback(edges, snapshot);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn('Failed to subscribe to follow requests', error);
      }
    },
  );
}

export async function cancelFollowRequest(targetUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const sourceUid = currentUser.uid;
  if (!targetUid || targetUid === sourceUid) {
    throw new Error('INVALID_TARGET');
  }

  const targetUserRef = doc(db, 'users', targetUid);
  const sourceUserRef = doc(db, 'users', sourceUid);
  const incomingRequestRef = followRequestDoc(targetUid, sourceUid);
  const outgoingRequestRef = followRequestSentDoc(sourceUid, targetUid);

  await runTransaction(db, async (transaction) => {
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      transaction.get(incomingRequestRef),
      transaction.get(outgoingRequestRef),
    ]);

    if (!incomingSnapshot.exists() && !outgoingSnapshot.exists()) {
      return;
    }

    transaction.delete(incomingRequestRef);
    transaction.delete(outgoingRequestRef);
    const now = serverTimestamp();
    transaction.update(sourceUserRef, { updatedAt: now });
    transaction.update(targetUserRef, { updatedAt: now });
  });
}

export async function approveFollowRequest(requesterUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const targetUid = currentUser.uid;
  if (!requesterUid || requesterUid === targetUid) {
    throw new Error('INVALID_TARGET');
  }

  const targetUserRef = doc(db, 'users', targetUid);
  const sourceUserRef = doc(db, 'users', requesterUid);
  const followingRef = followingDoc(requesterUid, targetUid);
  const followerRef = followerDoc(targetUid, requesterUid);
  const incomingRequestRef = followRequestDoc(targetUid, requesterUid);
  const outgoingRequestRef = followRequestSentDoc(requesterUid, targetUid);

  let notificationMessage: string | null = null;

  await runTransaction(db, async (transaction) => {
    const [sourceSnapshot, targetSnapshot, requestSnapshot, followingSnapshot] = await Promise.all([
      transaction.get(sourceUserRef),
      transaction.get(targetUserRef),
      transaction.get(incomingRequestRef),
      transaction.get(followingRef),
    ]);

    if (!sourceSnapshot.exists()) {
      throw new Error('REQUESTER_NOT_FOUND');
    }
    if (!targetSnapshot.exists()) {
      throw new Error('PROFILE_MISSING');
    }
    if (!requestSnapshot.exists()) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    if (followingSnapshot.exists()) {
      transaction.delete(incomingRequestRef);
      transaction.delete(outgoingRequestRef);
      return;
    }

    const now = serverTimestamp();
    const sourceSummary = mapSummaryFromProfile(requesterUid, sourceSnapshot.data());
    const targetSummary = mapSummaryFromProfile(targetUid, targetSnapshot.data());

    transaction.set(
      followingRef,
      {
        ...targetSummary,
        followedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      followerRef,
      {
        ...sourceSummary,
        followedAt: now,
      },
      { merge: true },
    );

    transaction.delete(incomingRequestRef);
    transaction.delete(outgoingRequestRef);

    transaction.update(sourceUserRef, {
      'stats.following': increment(1),
      updatedAt: now,
    });

    transaction.update(targetUserRef, {
      'stats.followers': increment(1),
      updatedAt: now,
    });

    notificationMessage = `${sourceSummary.displayName ?? 'Someone'} started following you.`;
  });

  if (notificationMessage) {
    try {
      await createNotification(targetUid, {
        type: 'new_follower',
        message: notificationMessage,
        metadata: { userId: requesterUid },
      });
    } catch (err) {
      console.warn('Failed to create notification for approved follow', err);
    }
  }
}

export async function rejectFollowRequest(requesterUid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }
  const targetUid = currentUser.uid;
  if (!requesterUid || requesterUid === targetUid) {
    throw new Error('INVALID_TARGET');
  }

  const targetUserRef = doc(db, 'users', targetUid);
  const sourceUserRef = doc(db, 'users', requesterUid);
  const incomingRequestRef = followRequestDoc(targetUid, requesterUid);
  const outgoingRequestRef = followRequestSentDoc(requesterUid, targetUid);

  await runTransaction(db, async (transaction) => {
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      transaction.get(incomingRequestRef),
      transaction.get(outgoingRequestRef),
    ]);

    if (!incomingSnapshot.exists() && !outgoingSnapshot.exists()) {
      return;
    }

    transaction.delete(incomingRequestRef);
    transaction.delete(outgoingRequestRef);
    const now = serverTimestamp();
    transaction.update(sourceUserRef, { updatedAt: now });
    transaction.update(targetUserRef, { updatedAt: now });
  });
}
