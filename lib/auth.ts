import type { User } from 'firebase/auth';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { auth, db } from './firebase';

/**
 * Ensures the user's profile and username records exist inside Firestore.
 * Throws if the desired display name has already been claimed by someone else.
 */
export async function ensureUserProfile(user: User) {
  const displayName = user.displayName?.trim();
  const email = user.email?.trim().toLowerCase();

  if (!displayName) {
    throw new Error('DISPLAY_NAME_MISSING');
  }

  const normalized = displayName.toLowerCase();
  const usernameRef = doc(db, 'usernames', normalized);
  const userRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (transaction) => {
    const usernameDoc = await transaction.get(usernameRef);
    if (usernameDoc.exists() && usernameDoc.data()?.uid !== user.uid) {
      throw new Error('USERNAME_CONFLICT');
    }

    const userDoc = await transaction.get(userRef);
    const profileData: Record<string, unknown> = {
      displayName,
      username: displayName,
      normalizedUsername: normalized,
      email,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    };

    if (!userDoc.exists()) {
      profileData.createdAt = serverTimestamp();
    }

    transaction.set(
      usernameRef,
      {
        uid: user.uid,
        displayName,
        normalized,
        linkedAt: serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(userRef, profileData, { merge: true });
  });
}

type GoogleCredentialInput = {
  idToken?: string | null;
  accessToken?: string | null;
};

export async function signInWithGoogleCredential({ idToken, accessToken }: GoogleCredentialInput) {
  if (!idToken && !accessToken) {
    throw new Error('GOOGLE_CREDENTIAL_MISSING');
  }

  const credential = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
  const result = await signInWithCredential(auth, credential);
  await ensureUserProfile(result.user);
  return result;
}
