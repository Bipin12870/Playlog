export type FollowUserSummary = {
  uid: string;
  displayName: string;
  username?: string | null;
  photoURL?: string | null;
  avatarKey?: string | null;
  bio?: string | null;
};

export type FollowEdge = FollowUserSummary & {
  followedAt?: string | null;
  mutual?: boolean | null;
  requestedAt?: string | null;
};
