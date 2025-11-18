import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useUserProfile } from '../../../lib/userProfile';
import { useFollowRequests } from '../../../lib/hooks/useFollowRequests';
import { getProfileVisibility } from '../../../lib/profileVisibility';
import { useGameFavorites } from '../../../lib/hooks/useGameFavorites';
import type { GameSummary } from '../../../types/game';

type ProfileAction = {
  key: 'followers' | 'following' | 'blocked' | 'requests' | 'edit' | 'reviews';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ACTIONS: ProfileAction[] = [
  { key: 'followers', title: 'Followers', description: 'See everyone keeping up with your activity.', icon: 'people' },
  { key: 'following', title: 'Following', description: 'Manage the players and friends you follow.', icon: 'person-add' },
  { key: 'blocked', title: 'Blocked users', description: 'Review and manage your blocked list.', icon: 'ban' },
  { key: 'requests', title: 'Follow requests', description: 'Approve or decline new followers.', icon: 'mail' },
  { key: 'edit', title: 'Edit Profile', description: 'Update your display name, avatar, and bio.', icon: 'create' },
  { key: 'reviews', title: 'Reviews', description: 'Revisit and manage shared reviews.', icon: 'chatbubble-ellipses' },
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
  const { favourites } = useGameFavorites();
  const pendingRequests = followRequests.requests.length;
  const visibility = getProfileVisibility(profile ?? undefined);
  const isMobile = Platform.OS !== 'web';

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
    if (profile.photoURL) return { uri: profile.photoURL };
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
          Log in to customise your Playlog presence. Update your display name, avatar, and bio once you’re signed in.
        </Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        <View style={styles.emptyActionRow}>
          <Pressable style={[styles.emptyBtn, styles.emptyPrimary]} onPress={() => router.push('/login')}>
            <Text style={styles.emptyPrimaryText}>Log in</Text>
          </Pressable>
          <Pressable style={[styles.emptyBtn, styles.emptySecondary]} onPress={() => router.push('/signup')}>
            <Text style={styles.emptySecondaryText}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isMobile) {
    return (
      <MobileProfile
        profile={profile}
        heroAvatar={heroAvatar}
        stats={stats}
        visibility={visibility}
        joinedLabel={joinedLabel}
        favourites={favourites}
        pendingRequests={pendingRequests}
        onNavigate={handleNavigate}
      />
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
                styles.actionRow,
                pressed && { backgroundColor: 'rgba(99,102,241,0.08)' },
              ]}
              onPress={() => handleNavigate(action)}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name={action.icon} size={20} color="#6366f1" />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              {action.key === 'requests' && pendingRequests > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MobileProfile({
  profile,
  heroAvatar,
  stats,
  visibility,
  joinedLabel,
  pendingRequests,
  onNavigate,
}: {
  profile: any;
  heroAvatar: ImageSourcePropType | null;
  stats: any;
  visibility: ReturnType<typeof getProfileVisibility>;
  joinedLabel: string | null;
  pendingRequests: number;
  onNavigate: (action: ProfileAction) => void;
}) {
  return (
    <SafeAreaView style={styles.mobileSafe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.mobileScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mobileHeaderRow}>
          <View style={styles.mobileProfileBubble}>
            <Ionicons name="person" size={20} color="#f8fafc" />
          </View>
        </View>

        <View style={styles.mobileHeroCard}>
          <View style={styles.mobileHeroRow}>
            <View style={styles.avatarWrapper}>
              {heroAvatar ? <Image source={heroAvatar} style={styles.avatarImage} /> : <Ionicons name="person" size={42} color="#1f2937" />}
            </View>
            <View style={styles.mobileHeroDetails}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              {profile.bio ? <Text style={styles.mobileBio}>{profile.bio}</Text> : null}
              {joinedLabel ? <Text style={styles.mobileJoined}>Joined {joinedLabel}</Text> : null}
            </View>
          </View>
          <View style={styles.mobileStatRow}>
            <MobileStat label="Following" value={formatCount(stats.following)} />
            <MobileStat label="Followers" value={formatCount(stats.followers)} />
            <MobileStat label="Blocked" value={formatCount(stats.blocked)} />
          </View>
        </View>

        <View style={styles.mobileActionsBlock}>
          {ACTIONS.map((action) => (
            <Pressable key={action.key} style={styles.mobileActionRow} onPress={() => onNavigate(action)}>
              <Ionicons name={action.icon} size={18} color="#f8fafc" />
              <Text style={styles.mobileActionLabel}>{action.title}</Text>
              {action.key === 'requests' && pendingRequests > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MobileStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.mobileStatBlock}>
      <Text style={styles.mobileStatValue}>{value}</Text>
      <Text style={styles.mobileStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 24 },
  heroCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    gap: 18,
  },
  heroRow: { flexDirection: 'row', gap: 16 },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 24 },
  heroDetails: { flex: 1, gap: 6 },
  displayName: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  bioText: { color: '#cbd5f5', fontSize: 14 },
  joinedText: { color: '#94a3b8', fontSize: 12 },
  visibilityRow: { gap: 6 },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: 999,
  },
  visibilityLabel: { color: '#f8fafc', fontSize: 12, fontWeight: '600' },
  visibilityHint: { color: '#94a3b8', fontSize: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#cbd5f5', fontSize: 13 },
  actionsCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    gap: 18,
  },
  actionsTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  actionList: { gap: 12 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { color: '#f8fafc', fontWeight: '700' },
  actionDescription: { color: '#94a3b8', fontSize: 13 },
  badge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  badgeLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#475569' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emptyCopy: { color: '#4b5563', textAlign: 'center' },
  errorText: { color: '#ef4444', marginTop: 8 },
  emptyActionRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 },
  emptyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPrimary: { backgroundColor: '#6366f1' },
  emptyPrimaryText: { color: '#f8fafc', fontWeight: '700' },
  emptySecondary: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: 'transparent',
  },
  emptySecondaryText: { color: '#0f172a', fontWeight: '700' },
  mobileSafe: { flex: 1, backgroundColor: '#0f172a' },
  mobileScroll: { padding: 20, gap: 24, backgroundColor: '#0f172a' },
  mobileHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  mobileProfileBubble: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1f1f21', alignItems: 'center', justifyContent: 'center' },
  mobileHeroCard: { backgroundColor: '#1c1c21', borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mobileHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mobileHeroDetails: { flex: 1 },
  mobileBio: { color: '#cbd5f5', fontSize: 13, marginTop: 4 },
  mobileJoined: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  mobileStatRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mobileStatBlock: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: '#26262b' },
  mobileStatValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  mobileStatLabel: { color: '#cbd5f5', fontSize: 12 },
  mobileActionsBlock: { marginTop: 12, borderRadius: 24, backgroundColor: '#1c1c21', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mobileActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)', gap: 12 },
  mobileActionLabel: { flex: 1, color: '#f8fafc', fontWeight: '600' },
});