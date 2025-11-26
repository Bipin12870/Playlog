import { useEffect, useState } from 'react';

import {
  AppNotification,
  markNotificationRead,
  subscribeToNotifications,
} from '../notifications';

type UseNotificationsResult = {
  notifications: AppNotification[];
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
};

export function useNotifications(uid: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      uid,
      (items) => {
        setNotifications(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [uid]);

  const markAsRead = async (id: string) => {
    if (!uid || !id) return;
    try {
      await markNotificationRead(uid, id);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error('Failed to mark notification as read'));
    }
  };

  return { notifications, loading, error, markAsRead };
}
