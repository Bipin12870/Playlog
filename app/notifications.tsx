import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthUser } from '../lib/hooks/useAuthUser';
import { useNotifications } from '../lib/hooks/useNotifications';
import type { AppNotification } from '../lib/notifications';
import { useTheme, type ThemeColors } from '../lib/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { styles, palette } = useMemo(() => themedStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthUser();
  const { notifications, loading, error, markAsRead, removeNotification } = useNotifications(
    user?.uid ?? null,
  );

  const [visibleCount, setVisibleCount] = useState(10);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(null);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, 10), notifications.length || 10));
  }, [notifications.length]);

  const visibleNotifications = notifications.slice(0, visibleCount);
  const hasMore = notifications.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, notifications.length));
  };

  const resolveHref = useCallback((item: AppNotification) => {
    switch (item.type) {
      case 'review_comment': {
        const gameId = item.metadata?.gameId;
        if (!gameId) return null;
        const reviewId = item.metadata?.reviewId;
        const reviewQuery = reviewId ? `&reviewId=${encodeURIComponent(reviewId)}` : '';
        return `/game/${gameId}?section=reviews${reviewQuery}`;
      }
      case 'new_follower': {
        const followerId = item.metadata?.userId;
        if (!followerId) return null;
        return `/profile/${followerId}`;
      }
      default:
        return null;
    }
  }, []);

  const handleDelete = useCallback(
    (item: AppNotification) => {
      if (Platform.OS === 'web') {
        setPendingDelete(item);
        return;
      }

      Alert.alert('Delete notification', 'Are you sure you want to delete this notification?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeNotification(item.id),
        },
      ]);
    },
    [removeNotification],
  );

  const handlePress = useCallback(
    (item: AppNotification) => {
      void markAsRead(item.id);
      const href = resolveHref(item);
      if (href) {
        router.push(href);
      } else {
        Alert.alert('Cannot open', 'This notification is missing link details.');
      }
    },
    [markAsRead, resolveHref, router],
  );

  const renderItem = ({ item }: { item: AppNotification }) => {
    const { iconName, iconColor } = getNotificationIcon(item.type);
    const isWeb = Platform.OS === 'web';
    const rowStyles = [
      styles.notificationRow,
      isWeb ? styles.notificationRowWeb : styles.notificationRowMobile,
      !item.read && styles.notificationRowUnread,
    ];
    return (
      <Pressable
        onPress={() => handlePress(item)}
        style={({ pressed }) => [rowStyles, pressed && styles.notificationRowPressed]}
      >
        <View style={[styles.notificationIconWrap, !isWeb && styles.notificationIconWrapMobile]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={[styles.notificationContent, !isWeb && styles.notificationContentMobile]}>
          <Text
            numberOfLines={2}
            style={[styles.notificationMessage, item.read && styles.notificationMessageRead]}
          >
            {item.message}
          </Text>
          <Text style={styles.notificationTimestamp}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.actionsWrap, !isWeb && styles.actionsWrapMobile]}>
          {!item.read ? <View style={styles.unreadDot} /> : <View style={styles.spacer} />}
          <Pressable
            onPress={(event) => {
              event?.stopPropagation?.();
              event?.preventDefault?.();
              handleDelete(item);
            }}
            onPressIn={(event) => {
              event?.stopPropagation?.();
              event?.preventDefault?.();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={palette.muted} />
          </Pressable>
        </View>
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
            contentContainerStyle={styles.listContent}
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
          {pendingDelete ? (
            <View style={styles.modalOverlay} pointerEvents="box-none">
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Delete notification</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to delete this notification?
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setPendingDelete(null)}
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.modalButtonPressed,
                    ]}
                  >
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const target = pendingDelete;
                      setPendingDelete(null);
                      if (target) {
                        void removeNotification(target.id);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.modalButtonPressed,
                    ]}
                  >
                    <Text style={styles.modalDelete}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
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
    pressed: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
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
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    listContent: {
      width: '100%',
      gap: 12,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      backgroundColor: palette.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 12,
      width: '100%',
    },
    notificationRowWeb: {
      alignItems: 'center',
    },
    notificationRowMobile: {
      alignItems: 'flex-start',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 18,
      minHeight: 88,
      gap: 16,
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
    notificationIconWrapMobile: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignSelf: 'center',
    },
    notificationContent: {
      flex: 1,
      gap: 4,
    },
    notificationContentMobile: {
      justifyContent: 'center',
      gap: 6,
    },
    notificationMessage: {
      color: palette.text,
      fontSize: 16,
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
    menuButton: {
      padding: 6,
      borderRadius: 8,
      marginRight: 4,
    },
    menuButtonPressed: {
      backgroundColor: palette.pressed,
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
    actionsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    actionsWrapMobile: {
      alignItems: 'center',
      gap: 12,
      alignSelf: 'center',
      marginLeft: 8,
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
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: palette.card,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      gap: 10,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.text,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 14,
      color: palette.subText,
      textAlign: 'center',
      marginTop: 4,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
    },
    modalButtonPressed: {
      backgroundColor: palette.pressed,
    },
    modalCancel: {
      color: palette.text,
      fontWeight: '700',
    },
    modalDelete: {
      color: palette.error,
      fontWeight: '700',
    },
  });

  return { styles, palette };
}
