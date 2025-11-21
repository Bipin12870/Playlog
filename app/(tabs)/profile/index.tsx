import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../../../lib/firebase';
import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { useUserProfile } from '../../../lib/userProfile';
import { useFollowRequests } from '../../../lib/hooks/useFollowRequests';
import { getProfileVisibility } from '../../../lib/profileVisibility';
import { resolveAvatarSource } from '../../../lib/avatar';

type ProfileAction = {
  key:
    | 'followers'
    | 'following'
    | 'blocked'
    | 'requests'
    | 'edit'
    | 'reviews'
    | 'visibility'
    | 'delete';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  section: 'Social' | 'Profile' | 'Content' | 'Privacy & Safety' | 'Account';
  variant?: 'destructive';
};

const ACTIONS: ProfileAction[] = [
  { key: 'followers', title: 'Followers', description: 'See everyone keeping up with your activity.', icon: 'people', section: 'Social' },
  { key: 'following', title: 'Following', description: 'Manage the players and friends you follow.', icon: 'person-add', section: 'Social' },
  { key: 'requests', title: 'Follow requests', description: 'Approve or decline new followers.', icon: 'mail', section: 'Social' },
  { key: 'blocked', title: 'Blocked users', description: 'Review and manage your blocked list.', icon: 'ban', section: 'Social' },
  { key: 'edit', title: 'Edit Profile', description: 'Update your display name, avatar, and bio.', icon: 'create', section: 'Profile' },
  { key: 'reviews', title: 'Reviews', description: 'Revisit and manage shared reviews.', icon: 'chatbubble-ellipses', section: 'Content' },
  { key: 'visibility', title: 'Visibility settings', description: 'Control who can follow, message, or see your activity.', icon: 'eye', section: 'Privacy & Safety' },
  { key: 'delete', title: 'Delete account', description: 'Permanently remove your account.', icon: 'trash', section: 'Account', variant: 'destructive' },
];

const ACTION_SECTIONS: Array<{ key: string; title: ProfileAction['section']; actions: ProfileAction[] }> = [
  { key: 'social', title: 'Social', actions: ACTIONS.filter((action) => action.section === 'Social') },
  { key: 'profile', title: 'Profile', actions: ACTIONS.filter((action) => action.section === 'Profile') },
  { key: 'content', title: 'Content', actions: ACTIONS.filter((action) => action.section === 'Content') },
  { key: 'privacy', title: 'Privacy & Safety', actions: ACTIONS.filter((action) => action.section === 'Privacy & Safety') },
  { key: 'account', title: 'Account', actions: ACTIONS.filter((action) => action.section === 'Account') },
];

const SECTION_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  social: { icon: 'people-circle', color: '#38bdf8' },
  profile: { icon: 'person-circle', color: '#a78bfa' },
  content: { icon: 'albums', color: '#22d3ee' },
  privacy: { icon: 'shield-checkmark', color: '#f97316' },
  account: { icon: 'settings', color: '#f472b6' },
};

const STAT_KEYS: Array<ProfileAction['key']> = ['following', 'followers', 'blocked'];
const STAT_LABELS: Record<ProfileAction['key'], string> = {
  followers: 'Followers',
  following: 'Following',
  blocked: 'Blocked',
  requests: 'Requests',
  edit: 'Edit Profile',
  reviews: 'Reviews',
  visibility: 'Visibility',
  delete: 'Delete',
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
  const isMobile = Platform.OS !== 'web';
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    ACTION_SECTIONS.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.key] = false;
      return acc;
    }, {}),
  );

  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt) return null;
    const date =
      profile.createdAt instanceof Date
        ? profile.createdAt
        : profile.createdAt.toDate?.() ?? null;
    if (!date) return null;
    return formatJoined(date);
  }, [profile?.createdAt]);

  const actionsByKey = useMemo(
    () =>
      ACTIONS.reduce<Record<ProfileAction['key'], ProfileAction>>((map, action) => {
        map[action.key] = action;
        return map;
      }, {} as Record<ProfileAction['key'], ProfileAction>),
    []
  );

  const heroAvatar = useMemo<ImageSourcePropType>(() => {
    return resolveAvatarSource(profile?.photoURL, profile?.avatarKey);
  }, [profile?.photoURL, profile?.avatarKey]);

  const stats = profile?.stats ?? {};
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Failed to sign out', error);
    }
  };

  const confirmSignOut = useCallback(() => {
    const execute = () => {
      void handleSignOut();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Are you sure you want to sign out?');
        if (confirmed) execute();
      } else {
        execute();
      }
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: execute },
    ]);
  }, []);

  const handleNavigate = (action: ProfileAction) => {
    router.push(`/(tabs)/profile/${action.key}`);
  };

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleStatPress = useCallback(
    (key: ProfileAction['key']) => {
      const action = actionsByKey[key];
      if (action) {
        handleNavigate(action);
      }
    },
    [actionsByKey]
  );

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
        pendingRequests={pendingRequests}
        onNavigate={handleNavigate}
        onPressStat={handleStatPress}
        onSignOut={confirmSignOut}
        openSections={openSections}
        onToggleSection={toggleSection}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarWrapper}>
            <Image source={heroAvatar} style={styles.avatarImage} />
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
          {STAT_KEYS.map((key) => (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.statBlock,
                pressed && styles.statBlockPressed,
              ]}
              onPress={() => handleStatPress(key)}
            >
              <Text style={styles.statValue}>{formatCount(stats[key])}</Text>
              <Text style={styles.statLabel}>{STAT_LABELS[key]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionStack}>
        {ACTION_SECTIONS.map((section) => (
          <View key={section.key} style={styles.sectionCard}>
            <Pressable
              style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
              onPress={() => toggleSection(section.key)}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons
                    name={SECTION_ICON[section.key]?.icon ?? 'grid'}
                    size={18}
                    color={SECTION_ICON[section.key]?.color ?? '#cbd5f5'}
                  />
                </View>
                <Text style={styles.actionsTitle}>{section.title}</Text>
              </View>
              <Ionicons
                name={openSections[section.key] ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#cbd5f5"
              />
            </Pressable>
            {openSections[section.key] ? (
              <View style={styles.actionList}>
                {section.actions.map((action) => {
                  const highlightColor = action.variant === 'destructive' ? '#ef4444' : '#6366f1';
                  const pressedBg =
                    action.variant === 'destructive'
                      ? 'rgba(239,68,68,0.08)'
                      : 'rgba(99,102,241,0.08)';
                  return (
                    <Pressable
                      key={action.key}
                      style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: pressedBg }]}
                      onPress={() => handleNavigate(action)}
                    >
                      <View
                        style={[
                          styles.actionIconWrap,
                          action.variant === 'destructive' && { backgroundColor: 'rgba(239,68,68,0.12)' },
                        ]}
                      >
                        <Ionicons name={action.icon} size={20} color={highlightColor} />
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
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
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
  onPressStat,
  onSignOut,
  openSections,
  onToggleSection,
}: {
  profile: any;
  heroAvatar: ImageSourcePropType;
  stats: any;
  visibility: ReturnType<typeof getProfileVisibility>;
  joinedLabel: string | null;
  pendingRequests: number;
  onNavigate: (action: ProfileAction) => void;
  onPressStat: (key: ProfileAction['key']) => void;
  onSignOut: () => void;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
}) {
  return (
    <SafeAreaView style={styles.mobileSafe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.mobileScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mobileHeaderRow}>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.mobileSignOutButton,
              pressed && styles.mobileSignOutButtonPressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.mobileSignOutLabel}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.mobileHeroCard}>
          <View style={styles.mobileHeroRow}>
            <View style={styles.avatarWrapper}>
              <Image source={heroAvatar} style={styles.avatarImage} />
            </View>
            <View style={styles.mobileHeroDetails}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              {profile.bio ? <Text style={styles.mobileBio}>{profile.bio}</Text> : null}
              {joinedLabel ? <Text style={styles.mobileJoined}>Joined {joinedLabel}</Text> : null}
            </View>
          </View>
          <View style={styles.mobileStatRow}>
            {STAT_KEYS.map((key) => (
              <Pressable
                key={`mobile-stat-${key}`}
                onPress={() => onPressStat(key)}
                style={({ pressed }) => [
                  styles.mobileStatBlock,
                  pressed && styles.mobileStatBlockPressed,
                ]}
              >
                <Text style={styles.mobileStatValue}>{formatCount(stats[key])}</Text>
                <Text style={styles.mobileStatLabel}>{STAT_LABELS[key]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.mobileActionsBlock}>
          {ACTION_SECTIONS.map((section) => (
            <View key={`mobile-${section.key}`}>
              <Pressable
                style={({ pressed }) => [
                  styles.mobileSectionHeader,
                  pressed && styles.mobileSectionHeaderPressed,
                ]}
                onPress={() => onToggleSection(section.key)}
              >
                <View style={styles.mobileSectionHeaderLeft}>
                  <View style={styles.mobileSectionIcon}>
                    <Ionicons
                      name={SECTION_ICON[section.key]?.icon ?? 'grid'}
                      size={16}
                      color={SECTION_ICON[section.key]?.color ?? '#cbd5f5'}
                    />
                  </View>
                  <Text style={styles.mobileSectionTitle}>{section.title}</Text>
                </View>
                <Ionicons
                  name={openSections[section.key] ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#cbd5f5"
                />
              </Pressable>
              {openSections[section.key]
                ? section.actions.map((action) => {
                    const highlightColor = action.variant === 'destructive' ? '#f87171' : '#f8fafc';
                    return (
                      <Pressable
                        key={`mobile-${action.key}`}
                        style={styles.mobileActionRow}
                        onPress={() => onNavigate(action)}
                      >
                        <Ionicons name={action.icon} size={18} color={highlightColor} />
                        <Text
                          style={[
                            styles.mobileActionLabel,
                            action.variant === 'destructive' && { color: '#f87171' },
                          ]}
                        >
                          {action.title}
                        </Text>
                        {action.key === 'requests' && pendingRequests > 0 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                          </View>
                        ) : null}
                        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                      </Pressable>
                    );
                  })
                : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    overflow: 'hidden',
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
  statBlockPressed: { opacity: 0.85 },
  statValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#cbd5f5', fontSize: 13 },
  sectionStack: { gap: 16 },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    overflow: 'hidden',
  },
  actionsTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderPressed: { opacity: 0.9 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionList: { gap: 12 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.15)',
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
  signOutButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  signOutButtonPressed: { opacity: 0.85 },
  signOutLabel: { color: '#f8fafc', fontWeight: '700' },
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
  mobileSignOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1c1c21',
  },
  mobileSignOutButtonPressed: { opacity: 0.8 },
  mobileSignOutLabel: { color: '#f8fafc', fontWeight: '600' },
  mobileHeroCard: { backgroundColor: '#1c1c21', borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mobileHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mobileHeroDetails: { flex: 1 },
  mobileBio: { color: '#cbd5f5', fontSize: 13, marginTop: 4 },
  mobileJoined: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  mobileStatRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mobileStatBlock: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: '#26262b' },
  mobileStatBlockPressed: { backgroundColor: '#2f2f36' },
  mobileStatValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  mobileStatLabel: { color: '#cbd5f5', fontSize: 12 },
  mobileActionsBlock: { marginTop: 12, borderRadius: 24, backgroundColor: '#1c1c21', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mobileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  mobileSectionHeaderPressed: { opacity: 0.85 },
  mobileSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileSectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(148,163,184,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSectionTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '700' },
  mobileActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)', gap: 12 },
  mobileActionLabel: { flex: 1, color: '#f8fafc', fontWeight: '600' },
});
