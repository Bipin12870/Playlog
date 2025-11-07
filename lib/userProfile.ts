import { updateProfile } from 'firebase/auth';
import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { auth, db } from './firebase';

export type ProfileStats = {
  following?: number;
  followers?: number;
  blocked?: number;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  username?: string | null;
  normalizedUsername?: string | null;
  email?: string | null;
  photoURL?: string | null;
  avatarKey?: string | null;
  bio?: string | null;
  profileVisibility?: 'public' | 'private';
  stats?: ProfileStats | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

type UpdateUserProfileInput = {
  displayName?: string;
  photoURL?: string | null;
  bio?: string | null;
  avatarKey?: string | null;
  profileVisibility?: 'public' | 'private';
};

export async function updateUserProfile(updates: UpdateUserProfileInput) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const hasDisplayName = typeof updates.displayName === 'string';
  const trimmedDisplay = hasDisplayName ? updates.displayName!.trim() : undefined;

  const userRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('PROFILE_MISSING');
    }

    const data = snapshot.data() as Partial<UserProfile>;
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (hasDisplayName && trimmedDisplay && trimmedDisplay !== data.displayName) {
      const normalized = trimmedDisplay.toLowerCase();
      const usernameRef = doc(db, 'usernames', normalized);
      const usernameDoc = await transaction.get(usernameRef);
      if (usernameDoc.exists() && usernameDoc.data()?.uid !== user.uid) {
        throw new Error('USERNAME_CONFLICT');
      }

      const previousNormalized = data.normalizedUsername;
      if (previousNormalized && previousNormalized !== normalized) {
        const previousRef = doc(db, 'usernames', previousNormalized);
        transaction.delete(previousRef);
      }

      transaction.set(
        usernameRef,
        {
          uid: user.uid,
          displayName: trimmedDisplay,
          normalized,
          linkedAt: serverTimestamp(),
        },
        { merge: true },
      );

      payload.displayName = trimmedDisplay;
      payload.username = trimmedDisplay;
      payload.normalizedUsername = normalized;
    }

    if (updates.photoURL !== undefined) {
      payload.photoURL = updates.photoURL ? updates.photoURL.trim() : null;
    }

    if (updates.bio !== undefined) {
      const cleaned = updates.bio?.trim() ?? '';
      payload.bio = cleaned.length ? cleaned : null;
    }

    if (updates.avatarKey !== undefined) {
      payload.avatarKey = updates.avatarKey ?? null;
      if (updates.avatarKey) {
        payload.photoURL = null;
      }
    }

    if (updates.profileVisibility !== undefined) {
      const nextVisibility = updates.profileVisibility === 'private' ? 'private' : 'public';
      if (nextVisibility !== (data.profileVisibility ?? 'public')) {
        payload.profileVisibility = nextVisibility;
      }
    }

    transaction.set(userRef, payload, { merge: true });
  });

  const profilePayload: Parameters<typeof updateProfile>[1] = {};
  if (hasDisplayName && trimmedDisplay) {
    profilePayload.displayName = trimmedDisplay;
  }
  if (updates.photoURL !== undefined) {
    profilePayload.photoURL = updates.photoURL ? updates.photoURL.trim() : null;
  } else if (updates.avatarKey !== undefined && updates.avatarKey) {
    profilePayload.photoURL = null;
  }

  if (Object.keys(profilePayload).length > 0) {
    await updateProfile(user, profilePayload);
  }
}

export function useUserProfile(uid?: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const profileRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        setLoading(false);
        if (!snapshot.exists()) {
          setProfile(null);
          setError(new Error('Profile not found'));
        } else {
          setProfile({ uid, ...(snapshot.data() as Omit<UserProfile, 'uid'>) });
          setError(null);
        }
      },
      (error) => {
        setLoading(false);
        setProfile(null);
        setError(error);
      },
    );

    return unsubscribe;
  }, [uid]);

  return useMemo(
    () => ({
      profile,
      loading,
      error,
    }),
    [profile, loading, error],
  );
}

export async function getUserProfile(uid: string) {
  const profileRef = doc(db, 'users', uid);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    return null;
  }
  return { uid, ...(snapshot.data() as Omit<UserProfile, 'uid'>) } as UserProfile;
}
