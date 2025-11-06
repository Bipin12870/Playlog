import type { UserProfile } from './userProfile';

export type ProfileVisibility = 'public' | 'private';

export function getProfileVisibility(profile?: Pick<UserProfile, 'profileVisibility'> | null): ProfileVisibility {
  if (!profile) return 'public';
  return profile.profileVisibility === 'private' ? 'private' : 'public';
}

export function canViewerAccessProfile(
  viewerUid: string | null | undefined,
  profile: UserProfile | null | undefined,
  options?: { isFollower?: boolean | null | undefined },
): boolean {
  if (!profile) return false;
  if (viewerUid && profile.uid === viewerUid) {
    return true;
  }
  if (options?.isFollower) {
    return true;
  }
  return getProfileVisibility(profile) === 'public';
}

export function isProfilePrivate(profile?: UserProfile | null): boolean {
  return getProfileVisibility(profile) === 'private';
}
