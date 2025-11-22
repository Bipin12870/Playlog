import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SearchResults } from '../../../components/home';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { useBlockRelationships } from '../../../lib/hooks/useBlockRelationships';
import { canViewerAccessProfile } from '../../../lib/profileVisibility';
import { useUserFavorites } from '../../../lib/hooks/useUserFavorites';
import { useUserProfile } from '../../../lib/userProfile';
import type { GameSummary } from '../../../types/game';
import { useTheme, type ThemeColors } from '../../../lib/theme';

function getColumnCount(width: number) {
  if (width >= 1400) return 5;
  if (width >= 1100) return 4;
  if (width >= 900) return 3;
  if (width >= 640) return 2;
  return 1;
}

export default function PublicFavouritesScreen() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const { user, initializing } = useAuthUser();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  const viewerUid = user?.uid ?? null;
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb;
  const baseColumnCount = useMemo(() => getColumnCount(width), [width]);
  const mobileColumnCount = width >= 640 ? 2 : 1;
  const rawColumnCount = isMobile ? mobileColumnCount : baseColumnCount;
  const columnCount = isWeb ? 6 : Math.max(rawColumnCount, 3);

  const { profile, loading: profileLoading, error } = useUserProfile(targetUid);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const blockRelationships = useBlockRelationships(viewerUid);
  const viewerBlockedTarget = targetUid ? blockRelationships.isBlocking(targetUid) : false;
  const viewerIsBlockedByTarget = targetUid ? blockRelationships.isBlockedBy(targetUid) : false;
  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
    hasBlocked: viewerBlockedTarget,
    isBlockedBy: viewerIsBlockedByTarget,
  });
  const favorites = useUserFavorites(canView ? targetUid : null);

  const handleSelect = (game: GameSummary) => {
    // TODO: push to game detail screen once available.
    console.log('View game', game.name);
  };

  if (initializing || profileLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        {error ? <Text style={styles.emptyCopy}>{error.message}</Text> : null}
      </View>
    );
  }

  if (viewerBlockedTarget || viewerIsBlockedByTarget) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="ban" size={36} color={colors.text} />
        <Text style={styles.privateTitle}>User not available</Text>
        <Text style={styles.privateCopy}>
          {viewerBlockedTarget
            ? 'You have blocked this player. Unblock them to view their favourites.'
            : 'This player has blocked you. Their favourites are hidden.'}
        </Text>
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="lock-closed" size={36} color={colors.text} />
        <Text style={styles.privateTitle}>Favourites are hidden</Text>
        <Text style={styles.privateCopy}>
          {hasPendingRequest
            ? 'Follow request sent. Favourites will appear once it is approved.'
            : 'This account is private. Follow and wait for approval to see their favourite games.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <SearchResults
        games={favorites.favorites}
        loading={favorites.loading}
        error={favorites.error?.message}
        columnCount={columnCount}
        onSelect={handleSelect}
        contentContainerStyle={isWeb ? undefined : styles.mobileResultsContent}
        gridRowStyle={isWeb ? undefined : styles.mobileGridRow}
        cardStyle={
          isWeb
            ? undefined
            : [
                styles.mobileCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]
        }
        emptyState={{
          title: 'No favourites yet',
          copy: `${profile.displayName} has not favourited any games.`,
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    loadingState: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyCopy: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    privateState: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    privateTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    privateCopy: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    mobileResultsContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    mobileGridRow: {
      gap: 16,
      paddingBottom: 18,
    },
    mobileCard: {
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 0,
    },
  });
}
