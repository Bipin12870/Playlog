import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Linking,
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
import { useFollowAlertsContext } from '../../../lib/hooks/useFollowAlerts';
import { SubscriptionOfferModal } from '../../../components/SubscriptionOfferModal';
import {
  planCatalog,
  createCheckoutSession,
  createBillingPortalSession,
  type PlanId,
} from '../../../lib/billing';
import { useTheme, type ThemeColors } from '../../../lib/theme';

type ProfileAction = {
  key:
    | 'followers'
    | 'following'
    | 'blocked'
    | 'requests'
    | 'edit'
    | 'reviews'
    | 'visibility'
    | 'delete'
    | 'preferences'
    | 'change-password';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  section: 'Profile' | 'Social' | 'Activity' | 'Preferences' | 'Privacy & Safety';
  variant?: 'destructive';
};

const ACTIONS: ProfileAction[] = [
  {
    key: 'edit',
    title: 'Edit Profile',
    description: 'Update your display name, avatar, and bio.',
    icon: 'create',
    section: 'Profile',
  },
  {
    key: 'visibility',
    title: 'Profile visibility',
    description: 'Control who can follow, message, or see your activity.',
    icon: 'eye',
    section: 'Profile',
  },
  {
    key: 'followers',
    title: 'Followers',
    description: 'See everyone keeping up with your activity.',
    icon: 'people',
    section: 'Social',
  },
  {
    key: 'following',
    title: 'Following',
    description: 'Manage the players and friends you follow.',
    icon: 'person-add',
    section: 'Social',
  },
  {
    key: 'requests',
    title: 'Follow requests',
    description: 'Approve or decline new followers.',
    icon: 'mail',
    section: 'Social',
  },
  {
    key: 'reviews',
    title: 'Reviews',
    description: 'Revisit and manage shared reviews.',
    icon: 'chatbubble-ellipses',
    section: 'Activity',
  },
  {
    key: 'preferences',
    title: 'Dark/Light mode',
    description: 'Pick your preferred appearance.',
    icon: 'contrast',
    section: 'Preferences',
  },
  {
    key: 'blocked',
    title: 'Blocked users',
    description: 'Review and manage your blocked list.',
    icon: 'ban',
    section: 'Privacy & Safety',
  },
  {
    key: 'change-password',
    title: 'Change password',
    description: 'Update your account password.',
    icon: 'key',
    section: 'Privacy & Safety',
  },
  {
    key: 'delete',
    title: 'Delete account',
    description: 'Permanently remove your account.',
    icon: 'trash',
    section: 'Privacy & Safety',
    variant: 'destructive',
  },
];

const ACTION_SECTIONS: Array<{
  key: string;
  title: ProfileAction['section'];
  actions: ProfileAction[];
}> = [
  {
    key: 'profile',
    title: 'Profile',
    actions: ACTIONS.filter((action) => action.section === 'Profile'),
  },
  {
    key: 'social',
    title: 'Social',
    actions: ACTIONS.filter((action) => action.section === 'Social'),
  },
  {
    key: 'activity',
    title: 'Activity',
    actions: ACTIONS.filter((action) => action.section === 'Activity'),
  },
  {
    key: 'preferences',
    title: 'Preferences',
    actions: ACTIONS.filter((action) => action.section === 'Preferences'),
  },
  {
    key: 'privacy',
    title: 'Privacy & Safety',
    actions: ACTIONS.filter((action) => action.section === 'Privacy & Safety'),
  },
];

const SECTION_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  profile: { icon: 'person-circle', color: '#a78bfa' },
  social: { icon: 'people-circle', color: '#38bdf8' },
  activity: { icon: 'albums', color: '#22d3ee' },
  preferences: { icon: 'contrast', color: '#fbbf24' },
  privacy: { icon: 'shield-checkmark', color: '#f97316' },
};

const STAT_KEYS = ['following', 'followers', 'blocked'] as const;
type StatKey = (typeof STAT_KEYS)[number];

const STAT_LABELS: Record<StatKey, string> = {
  followers: 'Followers',
  following: 'Following',
  blocked: 'Blocked',
};

function formatCount(value?: number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function formatJoined(dateValue?: Date | null) {
  if (!dateValue) return null;
  return dateValue.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfileHomeScreen() {
  const router = useRouter();
  const { colors, statusBarStyle, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const { profile, loading, error } = useUserProfile(uid);
  const followRequests = useFollowRequests(uid);
  const pendingRequests = followRequests.requests.length;
  const visibility = getProfileVisibility(profile ?? undefined);
  const isMobile = Platform.OS !== 'web';
  const followAlerts = useFollowAlertsContext();

  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [billingLoadingPlanId, setBillingLoadingPlanId] = useState<PlanId | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    ACTION_SECTIONS.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.key] = false;
      return acc;
    }, {}),
  );

  const isPremium = !!profile?.premium;

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
    [],
  );

  const heroAvatar = useMemo<ImageSourcePropType>(() => {
    return resolveAvatarSource(profile?.photoURL, profile?.avatarKey);
  }, [profile?.photoURL, profile?.avatarKey]);

  // Treat stats loosely but with string-keyed record so StatKey works
  const stats = (profile?.stats ?? {}) as Record<string, number>;

  const planInfo = useMemo(() => {
    const currentPlanId: PlanId = profile?.planId ?? (isPremium ? 'PREMIUM' : 'FREE');

    const currentPlan = planCatalog[currentPlanId];
    const planTitle = currentPlan?.title ?? (currentPlanId === 'PREMIUM' ? 'Premium' : 'Free');

    const rawStatus: string | null = profile?.subscriptionStatus ?? null;
    const rawEnd: any = profile?.currentPeriodEnd ?? null;

    let expirationLabel: string | null = null;
    if (rawEnd) {
      let end: Date | null = null;

      if (rawEnd && typeof rawEnd.toDate === 'function') {
        end = rawEnd.toDate();
      } else if (rawEnd instanceof Date) {
        end = rawEnd;
      } else if (typeof rawEnd === 'number' || typeof rawEnd === 'string') {
        const d = new Date(rawEnd);
        end = Number.isNaN(d.getTime()) ? null : d;
      }

      if (end) {
        expirationLabel = end.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }

    return {
      currentPlanId,
      planTitle,
      subscriptionStatus: rawStatus,
      expirationLabel,
    };
  }, [profile?.planId, profile?.subscriptionStatus, profile?.currentPeriodEnd, isPremium]);

  const { planTitle, subscriptionStatus, expirationLabel } = planInfo;
  const accentColor = colors.accent;
  const mutedIcon = colors.muted;
  const subtleIcon = colors.subtle;
  const dangerColor = colors.danger;
  const successColor = colors.success;
  const warningColor = colors.warning;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Failed to sign out', err);
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
    (key: StatKey) => {
      const action = actionsByKey[key];
      if (action) {
        handleNavigate(action);
      }
    },
    [actionsByKey],
  );

  const handleSelectPlan = useCallback(
    async (planId: PlanId) => {
      try {
        setBillingError(null);
        setBillingLoadingPlanId(planId);

        // If the user is already premium, tapping the plan means:
        // "Open Stripe customer portal so I can manage/cancel".
        if (isPremium) {
          const portalSession = await createBillingPortalSession();
          if (portalSession && portalSession.url) {
            await Linking.openURL(portalSession.url);
          } else {
            setBillingError('Unable to open billing portal.');
          }
          setSubscriptionModalVisible(false);
          return;
        }

        // Not premium yet:
        // FREE is non-billable → just close modal.
        if (planId === 'FREE') {
          setSubscriptionModalVisible(false);
          return;
        }

        // PREMIUM (or any paid plan) → go to Stripe Checkout.
        const session = await createCheckoutSession(planId);

        if (session && typeof session === 'object' && 'url' in session && session.url) {
          await Linking.openURL(session.url as string);
        } else {
          setBillingError('Unable to start checkout session.');
        }
      } catch (err) {
        console.error('Failed to start billing flow', err);
        setBillingError('Something went wrong starting billing.');
      } finally {
        setBillingLoadingPlanId(null);
      }
    },
    [isPremium],
  );

  const onManagePlan = useCallback(() => {
    setSubscriptionModalVisible(true);
  }, []);

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color={mutedIcon} />
        <Text style={styles.emptyTitle}>Sign in to manage your profile</Text>
        <Text style={styles.emptyCopy}>
          Log in to customise your Playlog presence. Update your display name, avatar, and bio
          once you’re signed in.
        </Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        <View style={styles.emptyActionRow}>
          <Pressable
            style={[styles.emptyBtn, styles.emptyPrimary]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.emptyPrimaryText}>Log in</Text>
          </Pressable>
          <Pressable
            style={[styles.emptyBtn, styles.emptySecondary]}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.emptySecondaryText}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isMobile) {
    return (
      <>
        <SubscriptionOfferModal
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
          onSelectPlan={handleSelectPlan}
          loadingPlanId={billingLoadingPlanId}
          errorMessage={billingError}
          premium={isPremium}
        />
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
          isPremium={isPremium}
          planTitle={planTitle}
          subscriptionStatus={subscriptionStatus}
          expirationLabel={expirationLabel}
          billingError={billingError}
          onManagePlan={onManagePlan}
          openSections={openSections}
          onToggleSection={toggleSection}
          statusBarStyle={statusBarStyle}
          styles={styles}
          subtleIcon={subtleIcon}
          accentColor={accentColor}
          dangerColor={dangerColor}
          warningColor={warningColor}
          successColor={successColor}
          mutedIcon={mutedIcon}
        />
      </>
    );
  }

  return (
    <>
      <SubscriptionOfferModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        onSelectPlan={handleSelectPlan}
        loadingPlanId={billingLoadingPlanId}
        errorMessage={billingError}
        premium={isPremium}
      />
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
                    color={visibility === 'private' ? warningColor : successColor}
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

              <View style={styles.subscriptionSection}>
                <View style={styles.subscriptionPlanRow}>
                  <View style={styles.subscriptionPlanCopy}>
                    <Text style={styles.subscriptionPlanLabel}>Plan :</Text>
                    <Text
                      style={[
                        styles.subscriptionPlanLine,
                        isPremium && styles.subscriptionPlanPremium,
                      ]}
                    >
                      {planTitle}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.subscriptionButton,
                      pressed && styles.subscriptionButtonPressed,
                    ]}
                    onPress={onManagePlan}
                  >
                    <Text style={styles.subscriptionButtonLabel}>
                      {isPremium ? 'Manage plan' : 'Choose plan'}
                    </Text>
                  </Pressable>
                </View>
                {expirationLabel ? (
                  <Text style={styles.subscriptionHint}>Valid through {expirationLabel}</Text>
                ) : null}
                {billingError ? <Text style={styles.billingError}>{billingError}</Text> : null}
              </View>
            </View>
          </View>
          <View style={styles.statRow}>
            {STAT_KEYS.map((key) => {
              const showFollowerAlert =
                key === 'followers' && followAlerts.hasFollowerAlerts;
              const showFollowingAlert =
                key === 'following' && followAlerts.hasFollowingAlerts;
              const showAlert = showFollowerAlert || showFollowingAlert;
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [
                    styles.statBlock,
                    pressed && styles.statBlockPressed,
                  ]}
                  onPress={() => handleStatPress(key)}
                >
                  {showAlert ? <View style={styles.statAlertDot} /> : null}
                  <Text style={styles.statValue}>{formatCount(stats[key])}</Text>
                  <Text style={styles.statLabel}>{STAT_LABELS[key]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionStack}>
          {ACTION_SECTIONS.map((section) => (
            <View key={section.key} style={styles.sectionCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed && styles.sectionHeaderPressed,
                ]}
                onPress={() => toggleSection(section.key)}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons
                      name={SECTION_ICON[section.key]?.icon ?? 'grid'}
                      size={18}
                      color={SECTION_ICON[section.key]?.color ?? subtleIcon}
                    />
                  </View>
                  <Text style={styles.actionsTitle}>{section.title}</Text>
                </View>
                <Ionicons
                  name={openSections[section.key] ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={subtleIcon}
                />
              </Pressable>
              {openSections[section.key] ? (
                <View style={styles.actionList}>
                  {section.actions.map((action) => {
                    const highlightColor =
                      action.variant === 'destructive' ? dangerColor : accentColor;
                    const pressedBg =
                      action.variant === 'destructive'
                        ? `${dangerColor}14`
                        : `${accentColor}14`;
                    return (
                      <Pressable
                        key={action.key}
                        style={({ pressed }) => [
                          styles.actionRow,
                          pressed && { backgroundColor: pressedBg },
                        ]}
                        onPress={() => handleNavigate(action)}
                      >
                        <View
                          style={[
                            styles.actionIconWrap,
                            action.variant === 'destructive' && {
                              backgroundColor: `${dangerColor}1f`,
                            },
                          ]}
                        >
                          <Ionicons name={action.icon} size={20} color={highlightColor} />
                        </View>
                        <View style={styles.actionCopy}>
                          <View style={styles.actionTitleRow}>
                            <Text style={styles.actionTitle}>{action.title}</Text>
                            {action.key === 'followers' && followAlerts.hasFollowerAlerts ? (
                              <View style={styles.inlineAlertDot} />
                            ) : null}
                            {action.key === 'following' && followAlerts.hasFollowingAlerts ? (
                              <View style={styles.inlineAlertDot} />
                            ) : null}
                          </View>
                          <Text style={styles.actionDescription}>{action.description}</Text>
                        </View>
                        {action.key === 'requests' && pendingRequests > 0 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                          </View>
                        ) : null}
                        <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ))}
        </View>

      </ScrollView>
    </>
  );
}

type MobileProfileProps = {
  profile: any;
  heroAvatar: ImageSourcePropType;
  stats: Record<string, number>;
  visibility: ReturnType<typeof getProfileVisibility>;
  joinedLabel: string | null;
  pendingRequests: number;
  onNavigate: (action: ProfileAction) => void;
  onPressStat: (key: StatKey) => void;
  onSignOut: () => void;
  isPremium: boolean;
  planTitle: string;
  subscriptionStatus: string | null;
  expirationLabel: string | null;
  billingError: string | null;
  onManagePlan: () => void;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  statusBarStyle: 'light-content' | 'dark-content';
  styles: ReturnType<typeof createStyles>;
  subtleIcon: string;
  accentColor: string;
  dangerColor: string;
  warningColor: string;
  successColor: string;
  mutedIcon: string;
};

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
  isPremium,
  planTitle,
  subscriptionStatus,
  expirationLabel,
  billingError,
  onManagePlan,
  openSections,
  onToggleSection,
  statusBarStyle,
  styles,
  subtleIcon,
  accentColor,
  dangerColor,
  warningColor,
  successColor,
  mutedIcon,
}: MobileProfileProps) {
  const followAlerts = useFollowAlertsContext();

  return (
    <SafeAreaView style={styles.mobileSafe}>
      <StatusBar barStyle={statusBarStyle} />
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
              <View style={styles.mobileVisibilityMeta}>
                <Ionicons
                  name={visibility === 'private' ? 'lock-closed' : 'globe'}
                  size={12}
                  color={visibility === 'private' ? warningColor : successColor}
                />
                <Text style={styles.mobileVisibilityLabel}>
                  {visibility === 'private' ? 'Private profile' : 'Public profile'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.mobileStatRow}>
            {STAT_KEYS.map((key) => {
              const showFollowerAlert =
                key === 'followers' && followAlerts.hasFollowerAlerts;
              const showFollowingAlert =
                key === 'following' && followAlerts.hasFollowingAlerts;
              const showAlert = showFollowerAlert || showFollowingAlert;
              return (
                <Pressable
                  key={`mobile-stat-${key}`}
                  onPress={() => onPressStat(key)}
                  style={({ pressed }) => [
                    styles.mobileStatBlock,
                    pressed && styles.mobileStatBlockPressed,
                  ]}
                >
                  {showAlert ? <View style={styles.statAlertDot} /> : null}
                  <Text style={styles.mobileStatValue}>{formatCount(stats[key])}</Text>
                  <Text style={styles.mobileStatLabel}>{STAT_LABELS[key]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Merged version of your richer mobile subscription card with theme colors */}
        <View style={styles.mobileSubscriptionCard}>
          <View style={styles.mobileSubscriptionHeader}>
            <Text style={styles.mobileSubscriptionLabel}>Plan</Text>
            <View style={styles.mobileSubscriptionStatusBadge}>
              <Text style={styles.mobileSubscriptionStatusText}>
                {subscriptionStatus
                  ? subscriptionStatus.toUpperCase()
                  : isPremium
                  ? 'ACTIVE'
                  : 'FREE'}
              </Text>
            </View>
          </View>
          <View style={styles.mobileSubscriptionBody}>
            <View>
              <Text style={styles.mobileSubscriptionPlan}>{planTitle}</Text>
              {expirationLabel ? (
                <Text style={styles.mobileSubscriptionHint}>Valid through {expirationLabel}</Text>
              ) : null}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.mobileSubscriptionButton,
                pressed && styles.mobileSubscriptionButtonPressed,
              ]}
              onPress={onManagePlan}
            >
              <Text style={styles.mobileSubscriptionButtonLabel}>
                {isPremium ? 'Manage plan' : 'Choose plan'}
              </Text>
            </Pressable>
          </View>
          {billingError ? <Text style={styles.billingError}>{billingError}</Text> : null}
        </View>

        <View style={styles.mobileActionsBlock}>
          {ACTION_SECTIONS.map((section) => (
            <View key={`mobile-${section.key}`} style={styles.mobileSectionCard}>
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
                      color={SECTION_ICON[section.key]?.color ?? subtleIcon}
                    />
                  </View>
                  <Text style={styles.mobileSectionTitle}>{section.title}</Text>
                </View>
                <Ionicons
                  name={openSections[section.key] ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={subtleIcon}
                />
              </Pressable>
              {openSections[section.key] ? (
                <View style={styles.mobileSectionBody}>
                  {section.actions.map((action, index) => {
                    const highlightColor =
                      action.variant === 'destructive' ? dangerColor : accentColor;
                    return (
                      <Pressable
                        key={`mobile-${action.key}`}
                        style={[
                          styles.mobileActionRow,
                          index > 0 && styles.mobileActionRowSpacing,
                        ]}
                        onPress={() => onNavigate(action)}
                      >
                        <Ionicons name={action.icon} size={18} color={highlightColor} />
                        <View style={styles.mobileActionLabelWrap}>
                          <Text
                            style={[
                              styles.mobileActionLabel,
                              action.variant === 'destructive' && { color: dangerColor },
                            ]}
                          >
                            {action.title}
                          </Text>
                          {action.key === 'followers' && followAlerts.hasFollowerAlerts ? (
                            <View style={styles.inlineAlertDot} />
                          ) : null}
                          {action.key === 'following' && followAlerts.hasFollowingAlerts ? (
                            <View style={styles.inlineAlertDot} />
                          ) : null}
                        </View>
                        {action.key === 'requests' && pendingRequests > 0 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeLabel}>{pendingRequests}</Text>
                          </View>
                        ) : null}
                        <Ionicons name="chevron-forward" size={16} color={subtleIcon} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  const warning = colors.warning;
  const danger = colors.danger;

  return StyleSheet.create({
    page: { padding: 24, gap: 24, backgroundColor: colors.background },
    heroCard: {
      padding: 24,
      borderRadius: 28,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      gap: 18,
    },
    heroRow: { flexDirection: 'row', gap: 16 },
    avatarWrapper: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: 72, height: 72, borderRadius: 24 },
    heroDetails: { flex: 1, gap: 6 },
    displayName: { color: colors.text, fontSize: 24, fontWeight: '800' },
    bioText: { color: subtle, fontSize: 14 },
    joinedText: { color: muted, fontSize: 12 },
    visibilityRow: { gap: 6 },
    visibilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : surfaceAlt,
      borderRadius: 999,
    },
    visibilityLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
    visibilityHint: { color: muted, fontSize: 12 },

    subscriptionSection: {
      gap: 8,
    },
    subscriptionPlanRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    subscriptionPlanCopy: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    subscriptionPlanLabel: { color: subtle, fontSize: 14, fontWeight: '600' },
    subscriptionPlanLine: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    subscriptionPlanPremium: {
      color: '#ffd500',
    },
    subscriptionHint: { color: muted, fontSize: 12 },
    subscriptionButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: accent,
    },
    subscriptionButtonPressed: {
      opacity: 0.9,
    },
    subscriptionButtonLabel: {
      color: isDark ? colors.text : '#ffffff',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    billingError: { color: danger, fontSize: 13, marginTop: 4 },

    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statBlock: { flex: 1, alignItems: 'center', position: 'relative' },
    statBlockPressed: { opacity: 0.85 },
    statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: subtle, fontSize: 13 },

    statAlertDot: {
      position: 'absolute',
      top: -4,
      left: '50%',
      transform: [{ translateX: -5 }],
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: warning,
    },
    inlineAlertDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: warning,
    },

    sectionStack: { gap: 16 },
    sectionCard: {
      borderRadius: 18,
      backgroundColor: surfaceAlt,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
    },
    actionsTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
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
      backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : surface,
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
      borderBottomColor: border,
    },
    actionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCopy: { flex: 1, gap: 4 },
    actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionTitle: { color: colors.text, fontWeight: '700' },
    actionDescription: { color: muted, fontSize: 13 },

    badge: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: warning,
      alignItems: 'center',
    },
    badgeLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },

    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: { color: muted },

    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: colors.background,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptyCopy: { color: muted, textAlign: 'center' },
    errorText: { color: danger, marginTop: 8 },
    emptyActionRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      marginTop: 16,
    },
    emptyBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPrimary: { backgroundColor: accent },
    emptyPrimaryText: { color: isDark ? colors.text : '#ffffff', fontWeight: '700' },
    emptySecondary: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: 'transparent',
    },
    emptySecondaryText: { color: colors.text, fontWeight: '700' },

    // Mobile styles
    mobileSafe: { flex: 1, backgroundColor: colors.background },
    mobileScroll: { padding: 20, gap: 24, backgroundColor: colors.background },
    mobileHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    mobileSignOutButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: surfaceAlt,
    },
    mobileSignOutButtonPressed: { opacity: 0.8 },
    mobileSignOutLabel: { color: colors.text, fontWeight: '600' },
    mobileHeroCard: {
      backgroundColor: surface,
      borderRadius: 28,
      padding: 20,
      gap: 16,
      borderWidth: 1,
      borderColor: border,
    },
    mobileHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    mobileHeroDetails: { flex: 1 },
    mobileBio: { color: subtle, fontSize: 13, marginTop: 4 },
    mobileJoined: { color: muted, fontSize: 12, marginTop: 2 },
    mobileVisibilityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    mobileVisibilityLabel: {
      color: subtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    mobileSubscriptionCard: {
      backgroundColor: surfaceAlt,
      borderRadius: 20,
      padding: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: border,
      gap: 8,
    },
    mobileSubscriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mobileSubscriptionLabel: { color: subtle, fontSize: 12, fontWeight: '600' },
    mobileSubscriptionStatusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: surface,
    },
    mobileSubscriptionStatusText: {
      color: subtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    mobileSubscriptionBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginTop: 6,
    },
    mobileSubscriptionPlan: { color: colors.text, fontSize: 18, fontWeight: '700' },
    mobileSubscriptionStatus: { color: subtle, fontSize: 13 },
    mobileSubscriptionHint: { color: muted, fontSize: 12 },
    mobileSubscriptionButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: accent,
    },
    mobileSubscriptionButtonPressed: {
      opacity: 0.9,
    },
    mobileSubscriptionButtonLabel: {
      color: isDark ? colors.text : '#ffffff',
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    mobileStatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 12,
    },
    mobileStatBlock: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: surfaceAlt,
      position: 'relative',
    },
    mobileStatBlockPressed: { backgroundColor: surface },
    mobileStatValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
    mobileStatLabel: { color: subtle, fontSize: 12 },

    mobileActionsBlock: {
      marginTop: 12,
      borderRadius: 24,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 4,
      gap: 12,
    },
    mobileSectionCard: {
      borderRadius: 20,
      backgroundColor: surfaceAlt,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
    },
    mobileSectionBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      backgroundColor: surface,
      gap: 8,
    },
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
      backgroundColor: isDark ? 'rgba(148,163,184,0.14)' : surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileSectionTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
    mobileActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: surface,
      gap: 10,
    },
    mobileActionRowSpacing: {
      marginTop: 10,
    },
    mobileActionLabelWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    mobileActionLabel: { color: colors.text, fontWeight: '600' },
  });
}
