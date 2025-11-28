import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

import { db } from './firebase';

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  createdAt: Date | null;
  read: boolean;
  metadata?: {
    gameId?: number;
    reviewId?: string;
    userId?: string;
  } | null;
};

function mapDocToNotification(snapshot: any): AppNotification {
  const data = snapshot.data() ?? {};
  const createdAt =
    data.createdAt && typeof data.createdAt.toDate === 'function'
      ? data.createdAt.toDate()
      : null;

  return {
    id: snapshot.id,
    type: data.type ?? '',
    message: data.message ?? '',
    createdAt,
    read: Boolean(data.read),
    metadata: data.metadata ?? null,
  };
}

export async function createNotification(
  targetUserId: string,
  data: { type: string; message: string; metadata?: AppNotification['metadata'] },
) {
  if (!targetUserId) return;

  const userRef = doc(db, 'users', targetUserId);
  const userSnap = await getDoc(userRef);
  const notificationsEnabled = userSnap.exists()
    ? userSnap.data()?.notificationsEnabled
    : true;

  if (notificationsEnabled === false) {
    return;
  }

  const notificationsRef = collection(userRef, 'notifications');
  await addDoc(notificationsRef, {
    type: data.type,
    message: data.message,
    metadata: data.metadata ?? null,
    createdAt: serverTimestamp(),
    read: false,
  });
}

export function subscribeToNotifications(
  uid: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const notificationsRef = collection(doc(db, 'users', uid), 'notifications');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapDocToNotification(docSnap));
      onUpdate(items);
    },
    (error) => {
      console.warn('Failed to subscribe to notifications', error);
      onError?.(error);
    },
  );

  return unsubscribe;
}

export async function markNotificationRead(uid: string, notificationId: string) {
  if (!uid || !notificationId) return;
  const notificationRef = doc(db, 'users', uid, 'notifications', notificationId);
  await updateDoc(notificationRef, { read: true });
}

export async function updateNotificationSetting(uid: string, enabled: boolean) {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { notificationsEnabled: enabled });
}

export async function deleteNotification(uid: string, notificationId: string) {
  if (!uid || !notificationId) return;
  const notificationRef = doc(db, 'users', uid, 'notifications', notificationId);
  await deleteDoc(notificationRef);
}
