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
import { canViewerAccessProfile, getProfileVisibility } from '../../../lib/profileVisibility';
import { useFollowState } from '../../../lib/hooks/useFollowState';
import { useUserProfile } from '../../../lib/userProfile';

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
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = params.uid ?? null;
  const { user: viewer, initializing } = useAuthUser();
  const viewerUid = viewer?.uid ?? null;

  const { profile, loading, error } = useUserProfile(targetUid);
  const visibility = getProfileVisibility(profile ?? undefined);
  const { isFollowing, hasPendingRequest } = useFollowState({
    currentUid: viewerUid,
    targetUid,
  });
  const canView = canViewerAccessProfile(viewerUid, profile ?? undefined, {
    isFollower: isFollowing,
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

  const handleNavigate = (action: ProfileAction) => {
    if (!targetUid) return;
    router.push(`/profile/${targetUid}/${action.key}`);
  };

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!targetUid || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Profile not found</Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
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
              <Ionicons name="person" size={42} color="#1f2937" />
            )}
          </View>
          <View style={styles.heroDetails}>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              {!isSelf ? (
                <View style={styles.heroActions}>
                  <FollowButton targetUid={profile.uid} onAuthRequired={() => router.push('/login')} />
                  <BlockButton targetUid={profile.uid} onAuthRequired={() => router.push('/login')} />
                </View>
              ) : null}
            </View>
            {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            {joinedLabel ? (
              <View style={styles.metaRow}>
                <Text style={styles.joinedText}>Joined {joinedLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{formatCount(stats.following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{formatCount(stats.followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{formatCount(stats.blocked)}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
        </View>
      </View>

      {!canView ? (
        <View style={styles.privateCard}>
          <Ionicons name="lock-closed" size={28} color="#f9fafb" />
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
                  <Ionicons name={action.icon} size={22} color="#6366f1" />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {canView ? (
        <View style={styles.quickGlanceCard}>
          <Text style={styles.quickGlanceTitle}>At a glance</Text>
          <View style={styles.quickGlanceRow}>
            <View style={styles.quickGlanceItem}>
              <Text style={styles.quickGlanceValue}>{followers.edges.length}</Text>
              <Text style={styles.quickGlanceLabel}>Followers</Text>
            </View>
            <View style={styles.quickGlanceItem}>
              <Text style={styles.quickGlanceValue}>{following.edges.length}</Text>
              <Text style={styles.quickGlanceLabel}>Following</Text>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    gap: 24,
    backgroundColor: '#0f172a',
  },
  heroCard: {
    backgroundColor: '#374151',
    borderRadius: 24,
    padding: 24,
    gap: 16,
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
    backgroundColor: '#d1d5db',
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
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
  },
  bioText: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5f5',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  actionsTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  actionList: {
    gap: 12,
  },
  actionItem: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
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
    color: '#f9fafb',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#cbd5f5',
  },
  privateCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  privateTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  privateCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
  quickGlanceCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  quickGlanceTitle: {
    color: '#f9fafb',
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
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  quickGlanceLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
});
