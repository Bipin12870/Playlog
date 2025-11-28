import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthUser } from '../lib/hooks/useAuthUser';
import { useNotifications } from '../lib/hooks/useNotifications';
import { useTheme, type ThemeColors } from '../lib/theme';

export type NotificationRow = {
  id: string;
  type: string;
  message: string;
  createdAt: Date | null;
  read: boolean;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { styles, palette } = useMemo(() => themedStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthUser();
  const { notifications, loading, error, markAsRead } = useNotifications(user?.uid ?? null);

  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, 10), notifications.length || 10));
  }, [notifications.length]);

  const visibleNotifications = notifications.slice(0, visibleCount);
  const hasMore = notifications.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, notifications.length));
  };

  const renderItem = ({ item }: { item: NotificationRow }) => {
    const { iconName, iconColor } = getNotificationIcon(item.type);
    return (
        <Pressable
          onPress={() => markAsRead(item.id)}
          style={({ pressed }) => [
            styles.notificationRow,
            !item.read && styles.notificationRowUnread,
            pressed && styles.notificationRowPressed,
          ]}
        >
        <View style={styles.notificationIconWrap}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.notificationContent}>
          <Text
            numberOfLines={2}
            style={[styles.notificationMessage, item.read && styles.notificationMessageRead]}
          >
            {item.message}
          </Text>
          <Text style={styles.notificationTimestamp}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        {!item.read ? <View style={styles.unreadDot} /> : <View style={styles.spacer} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.headerIconWrap, pressed && styles.headerIconPressed]}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

      {!user?.uid ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>You need to be signed in to see notifications.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={visibleNotifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          {hasMore ? (
            <Pressable
              style={({ pressed }) => [
                styles.showMoreButton,
                pressed && styles.showMoreButtonPressed,
              ]}
              onPress={handleShowMore}
            >
              <Text style={styles.showMoreLabel}>Show more</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

function getNotificationIcon(type: string): { iconName: any; iconColor: string } {
  switch (type) {
    case 'friend_request':
      return { iconName: 'person-add-outline', iconColor: '#3b82f6' };
    case 'new_follower':
      return { iconName: 'person-outline', iconColor: '#a855f7' };
    case 'review_comment':
      return { iconName: 'chatbubble-ellipses-outline', iconColor: '#22c55e' };
    default:
      return { iconName: 'notifications-outline', iconColor: '#94a3b8' };
  }
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Just now';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function themedStyles(colors: ThemeColors, isDark: boolean) {
  const palette = {
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    muted: colors.muted,
    subText: colors.subtle,
    accent: colors.accent,
    unreadBg: colors.surfaceSecondary,
    pressed: isDark ? colors.surfaceSecondary : '#e5e7eb',
    error: colors.danger,
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      backgroundColor: palette.background,
    },
    headerIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    headerIconPressed: { opacity: 0.85 },
    headerTitle: {
      color: palette.text,
      fontSize: 17,
      fontWeight: '700',
    },
    headerSpacer: {
      width: 36,
      height: 36,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: palette.background,
    },
    emptyText: {
      color: palette.muted,
      textAlign: 'center',
      fontSize: 15,
    },
    listContainer: {
      flex: 1,
      padding: 16,
      gap: 12,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 12,
    },
    notificationRowUnread: {
      backgroundColor: palette.unreadBg,
    },
    notificationRowPressed: {
      backgroundColor: palette.pressed,
    },
    notificationIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#0f172a' : '#eef2ff',
    },
    notificationContent: {
      flex: 1,
      gap: 4,
    },
    notificationMessage: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '700',
    },
    notificationMessageRead: {
      color: palette.muted,
      fontWeight: '600',
    },
    notificationTimestamp: {
      color: palette.subText,
      fontSize: 12,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22c55e',
    },
    spacer: {
      width: 10,
      height: 10,
    },
    separator: {
      height: 10,
    },
    showMoreButton: {
      marginTop: 8,
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    showMoreButtonPressed: {
      opacity: 0.9,
    },
    showMoreLabel: {
      color: palette.text,
      fontWeight: '700',
    },
    errorText: {
      color: palette.error,
      marginHorizontal: 16,
      marginTop: 6,
      fontSize: 13,
    },
  });

  return { styles, palette };
}
