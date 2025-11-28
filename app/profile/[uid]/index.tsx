import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BlockButton, FollowButton } from '../../../components/profile';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useFollowers, useFollowing } from '../../../lib/hooks/useFollowList';
import { canViewerAccessProfile } from '../../../lib/profileVisibility';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { useBlockRelationships } from '../../../lib/hooks/useBlockRelationships';
import { useUserProfile } from '../../../lib/userProfile';
import { useTheme, type ThemeColors } from '../../../lib/theme';

type ProfileAction = {
  key: 'followers' | 'following' | 'favourites' | 'reviews';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ACTIONS: ProfileAction[] = [
  {
    key: 'favourites',
    title: 'Favourites',
    description: 'Browse their favourite games.',
    icon: 'heart',
  },
  {
    key: 'followers',
    title: 'Followers',
    description: 'See who is following them.',
    icon: 'people',
  },
  {
    key: 'following',
    title: 'Following',
    description: 'Check out who they follow.',
    icon: 'person-add',
  },
  {
    key: 'reviews',
    title: 'Reviews',
    description: 'Read their latest game reviews.',
    icon: 'chatbubble-ellipses',
  },
];

const PRESET_AVATAR_MAP: Record<string, ImageSourcePropType> = {
  mario: require('../../../assets/mario.png'),
  party: require('../../../assets/characters.png'),
  runner: require('../../../assets/runners.png'),
  glare: require('../../../assets/glare.png'),
};

function formatCount(value?: number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function formatJoined(dateValue?: Date | null) {
  if (!dateValue) return null;
  return dateValue.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const { user: viewer, initializing } = useAuthUser();
  const viewerUid = viewer?.uid ?? null;
  const blockRelationships = useBlockRelationships(viewerUid);

  const { profile, loading, error } = useUserProfile(targetUid);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const viewerBlockedTarget = targetUid ? blockRelationships.isBlocking(targetUid) : false;
  const viewerIsBlockedByTarget = targetUid ? blockRelationships.isBlockedBy(targetUid) : false;
  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
    hasBlocked: viewerBlockedTarget,
    isBlockedBy: viewerIsBlockedByTarget,
  });
  const followers = useFollowers(canView ? targetUid : null);
  const following = useFollowing(canView ? targetUid : null);

  const heroAvatar: ImageSourcePropType | null = useMemo(() => {
    if (!profile) return null;
    if (profile.photoURL) {
      return { uri: profile.photoURL };
    }
    if (profile.avatarKey && PRESET_AVATAR_MAP[profile.avatarKey]) {
      return PRESET_AVATAR_MAP[profile.avatarKey];
    }
    return null;
  }, [profile]);

  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt || typeof profile.createdAt?.toDate !== 'function') {
      return null;
    }
    return formatJoined(profile.createdAt.toDate());
  }, [profile?.createdAt]);

  const stats = profile?.stats ?? {};
  const followerCount = canView ? followers.edges.length : formatCount(stats.followers);
  const followingCount = canView ? following.edges.length : formatCount(stats.following);
  const statItems: Array<{ key: 'followers' | 'following'; label: string; value: number }> = [
    { key: 'following', label: 'Following', value: followingCount },
    { key: 'followers', label: 'Followers', value: followerCount },
  ];
  const accentColor = colors.accent;
  const subtleIcon = colors.subtle;
  const mutedIcon = colors.muted;
  const dangerColor = colors.danger;

  const handleNavigate = (action: ProfileAction) => {
    if (!targetUid) return;
    router.push(`/profile/${targetUid}/${action.key}`);
  };
  const handleStatPress = (key: 'followers' | 'following') => {
    if (!targetUid) return;
    if (key === 'followers') {
      router.push(`/profile/${targetUid}/followers`);
      return;
    }
    if (key === 'following') {
      router.push(`/profile/${targetUid}/following`);
    }
  };

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color={mutedIcon} />
        <Text style={styles.emptyTitle}>Profile not found</Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
      </View>
    );
  }

  if (viewerBlockedTarget || viewerIsBlockedByTarget) {
    const blockedCopy = viewerBlockedTarget
      ? 'You have blocked this player. Unblock them to view their profile again.'
      : 'This player has blocked you. Their profile is not available.';
    return (
      <View style={styles.emptyState}>
        <Ionicons name="ban" size={64} color={dangerColor} />
        <Text style={styles.emptyTitle}>User not available</Text>
        <Text style={styles.blockedCopy}>{blockedCopy}</Text>
        {viewerBlockedTarget ? (
          <BlockButton
            targetUid={targetUid}
            currentUid={viewerUid}
            onAuthRequired={() => router.push('/login')}
            style={styles.blockedAction}
          />
        ) : null}
      </View>
    );
  }

  const isSelf = viewerUid === profile.uid;

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarWrapper}>
            {heroAvatar ? (
              <Image source={heroAvatar} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={42} color={mutedIcon} />
            )}
          </View>
          <View style={styles.heroDetails}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.username ? (
              <Text style={styles.username}>@{profile.username}</Text>
            ) : null}
            {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            {joinedLabel ? (
              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Ionicons name="calendar" size={14} color={subtleIcon} />
                  <Text style={styles.heroChipText}>Joined {joinedLabel}</Text>
                </View>
              </View>
            ) : null}
            {!isSelf ? (
              <View style={styles.heroActions}>
                <FollowButton
                  targetUid={profile.uid}
                  currentUid={viewerUid}
                  onAuthRequired={() => router.push('/login')}
                  style={styles.heroActionButton}
                />
                <BlockButton
                  targetUid={profile.uid}
                  currentUid={viewerUid}
                  onAuthRequired={() => router.push('/login')}
                  style={styles.heroActionButton}
                />
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.statGrid}>
          {statItems.map((stat) => (
            <Pressable
              key={stat.key}
              style={({ pressed }) => [
                styles.statCard,
                pressed && styles.statCardPressed,
              ]}
              hitSlop={6}
              onPress={() => handleStatPress(stat.key)}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!canView ? (
        <View style={styles.privateCard}>
          <Ionicons name="lock-closed" size={28} color={colors.text} />
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.privateCopy}>
            {hasPendingRequest
              ? 'Follow request sent. You’ll get access once it is approved.'
              : 'Follow and wait for approval to view their favourites, followers, following, and reviews.'}
          </Text>
        </View>
      ) : (
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Explore {isSelf ? 'your' : `${profile.displayName}'s`} activity</Text>
          <View style={styles.actionList}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={() => handleNavigate(action)}
                accessibilityRole="button"
                accessibilityLabel={action.title}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={22} color={accentColor} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {canView ? null : null}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const surface = colors.surface;
  const surfaceAlt = colors.surfaceSecondary;
  const border = colors.border;
  const muted = colors.muted;
  const subtle = colors.subtle;
  const accent = colors.accent;
  const accentSoft = colors.accentSoft;
  const danger = colors.danger;

  return StyleSheet.create({
    page: {
      padding: 24,
      gap: 24,
      backgroundColor: colors.background,
    },
    heroCard: {
      backgroundColor: surface,
      borderRadius: 28,
      padding: 24,
      gap: 20,
      borderWidth: 1,
      borderColor: border,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    avatarWrapper: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    heroDetails: {
      flex: 1,
      gap: 8,
    },
    displayName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    username: {
      color: subtle,
      fontSize: 14,
    },
    bioText: {
      color: subtle,
      fontSize: 14,
    },
    heroChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(148,163,184,0.15)' : surfaceAlt,
    },
    heroChipText: {
      color: subtle,
      fontSize: 12,
      fontWeight: '600',
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    heroActionButton: {
      flexGrow: 1,
      flexBasis: '48%',
      minWidth: 140,
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flexGrow: 1,
      flexBasis: '30%',
      minWidth: 110,
      backgroundColor: surfaceAlt,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: border,
    },
    statCardPressed: {
      backgroundColor: accentSoft,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: subtle,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    actionsCard: {
      backgroundColor: surfaceAlt,
      borderRadius: 24,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: border,
    },
    actionsTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    actionList: {
      gap: 12,
    },
    actionItem: {
      backgroundColor: surface,
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: 1,
      borderColor: border,
    },
    actionItemPressed: {
      transform: [{ scale: 0.98 }],
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCopy: {
      flex: 1,
      gap: 4,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    actionSubtitle: {
      fontSize: 13,
      color: subtle,
    },
    privateCard: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 24,
      gap: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    privateTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    privateCopy: {
      color: subtle,
      fontSize: 14,
      textAlign: 'center',
    },
    quickGlanceCard: {
      backgroundColor: surfaceAlt,
      borderRadius: 24,
      padding: 24,
      gap: 16,
    },
    quickGlanceTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    quickGlanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    quickGlanceItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    quickGlanceValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    quickGlanceLabel: {
      color: subtle,
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    loadingState: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: subtle,
      fontSize: 16,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 32,
      gap: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    blockedCopy: {
      color: subtle,
      fontSize: 14,
      textAlign: 'center',
    },
    blockedAction: {
      marginTop: 8,
    },
    errorText: {
      color: danger,
      fontSize: 14,
    },
  });
}
