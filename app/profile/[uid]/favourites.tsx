import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SearchResults } from '../../../components/home';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { canViewerAccessProfile } from '../../../lib/profileVisibility';
import { useUserFavorites } from '../../../lib/hooks/useUserFavorites';
import { useUserProfile } from '../../../lib/userProfile';
import type { GameSummary } from '../../../types/game';

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
  const viewerUid = user?.uid ?? null;
  const { width } = useWindowDimensions();
  const columnCount = useMemo(() => getColumnCount(width), [width]);

  const { profile, loading: profileLoading, error } = useUserProfile(targetUid);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
  });
  const favorites = useUserFavorites(canView ? targetUid : null);

  const handleSelect = (game: GameSummary) => {
    // TODO: push to game detail screen once available.
    console.log('View game', game.name);
  };

  if (initializing || profileLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        {error ? <Text style={styles.emptyCopy}>{error.message}</Text> : null}
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.privateState}>
        <Ionicons name="lock-closed" size={36} color="#f9fafb" />
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
        contentContainerStyle={columnCount === 1 ? styles.singleColumnContent : undefined}
        gridRowStyle={columnCount === 1 ? styles.singleColumnRow : undefined}
        cardStyle={columnCount === 1 ? styles.singleColumnCard : undefined}
        emptyState={{
          title: 'No favourites yet',
          copy: `${profile.displayName} has not favourited any games.`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  privateState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  privateCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  singleColumnContent: {
    alignItems: 'center',
  },
  singleColumnRow: {
    gap: 0,
    paddingBottom: 20,
  },
  singleColumnCard: {
    flex: 0,
    maxWidth: 420,
    width: '100%',
  },
});
