import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useUserProfile } from '../../../lib/userProfile';
import { useFollowRequests } from '../../../lib/hooks/useFollowRequests';
import { getProfileVisibility } from '../../../lib/profileVisibility';

type ProfileAction = {
  key: 'followers' | 'following' | 'blocked' | 'requests' | 'edit' | 'reviews';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ACTIONS: ProfileAction[] = [
  {
    key: 'followers',
    title: 'Followers',
    description: 'See everyone keeping up with your activity.',
    icon: 'people',
  },
  {
    key: 'following',
    title: 'Following',
    description: 'Manage the players and friends you follow.',
    icon: 'person-add',
  },
  {
    key: 'blocked',
    title: 'Blocked users',
    description: 'Review and manage your blocked list.',
    icon: 'ban',
  },
  {
    key: 'requests',
    title: 'Follow requests',
    description: 'Approve or decline new followers.',
    icon: 'mail',
  },
  {
    key: 'edit',
    title: 'Edit Profile',
    description: 'Update your display name, avatar, and bio.',
    icon: 'create',
  },
  {
    key: 'reviews',
    title: 'Reviews',
    description: 'Revisit and manage the reviews you have shared.',
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

export default function ProfileHomeScreen() {
  const router = useRouter();
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const { profile, loading, error } = useUserProfile(uid);
  const followRequests = useFollowRequests(uid);
  const pendingRequests = followRequests.requests.length;
  const visibility = getProfileVisibility(profile ?? undefined);

  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt) return null;
    const date =
      profile.createdAt instanceof Date
        ? profile.createdAt
        : profile.createdAt.toDate?.() ?? null;
    if (!date) return null;
    return formatJoined(date);
  }, [profile?.createdAt]);

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

  const stats = profile?.stats ?? {};

  const handleNavigate = (action: ProfileAction) => {
    router.push(`/(tabs)/profile/${action.key}`);
  };

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to manage your profile</Text>
        <Text style={styles.emptyCopy}>
          Log in to customise your Playlog presence. Update your display name, avatar, and bio once
          you’re signed in.
        </Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
      </View>
    );
  }

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
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            {joinedLabel ? <Text style={styles.joinedText}>Joined {joinedLabel}</Text> : null}
            <View style={styles.visibilityRow}>
              <View style={styles.visibilityBadge}>
                <Ionicons
                  name={visibility === 'private' ? 'lock-closed' : 'globe'}
                  size={14}
                  color={visibility === 'private' ? '#f97316' : '#22c55e'}
                />
                <Text style={styles.visibilityLabel}>
                  {visibility === 'private' ? 'Private profile' : 'Public profile'}
                </Text>
              </View>
              <Text style={styles.visibilityHint}>
                {visibility === 'private'
                  ? 'Only approved followers can see your favourites and reviews.'
                  : 'Anyone on Playlog can see your favourites and reviews.'}
              </Text>
            </View>
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

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Manage your profile</Text>
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
                  {action.key === 'requests' && pendingRequests > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
      </View>
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
    gap: 6,
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
  joinedText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  visibilityRow: {
    gap: 6,
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  visibilityLabel: {
    color: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  visibilityHint: {
    color: '#cbd5f5',
    fontSize: 12,
    lineHeight: 16,
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
  badge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#f97316',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLabel: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
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
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },
});
