import type { UserProfile } from './userProfile';

export type ProfileVisibility = 'public' | 'private';

export function getProfileVisibility(profile?: Pick<UserProfile, 'profileVisibility'> | null): ProfileVisibility {
  if (!profile) return 'public';
  return profile.profileVisibility === 'private' ? 'private' : 'public';
}

type ViewerAccessOptions = {
  isFollower?: boolean | null | undefined;
  hasBlocked?: boolean | null | undefined;
  isBlockedBy?: boolean | null | undefined;
};

export function canViewerAccessProfile(
  viewerUid: string | null | undefined,
  profile: UserProfile | null | undefined,
  options?: ViewerAccessOptions,
): boolean {
  if (!profile) return false;
  if (viewerUid && profile.uid === viewerUid) {
    return true;
  }
  if (options?.hasBlocked || options?.isBlockedBy) {
    return false;
  }
  if (options?.isFollower) {
    return true;
  }
  return getProfileVisibility(profile) === 'public';
}

export function isProfilePrivate(profile?: UserProfile | null): boolean {
  return getProfileVisibility(profile) === 'private';
}
