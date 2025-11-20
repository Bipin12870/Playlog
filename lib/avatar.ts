import type { ImageSourcePropType } from 'react-native';

const PRESET_AVATAR_MAP: Record<string, ImageSourcePropType> = {
  mario: require('../assets/mario.png'),
  party: require('../assets/characters.png'),
  runner: require('../assets/runners.png'),
  glare: require('../assets/glare.png'),
};

const DEFAULT_AVATAR: ImageSourcePropType = require('../assets/icon.png');

export function resolveAvatarSource(
  photoURL?: string | null,
  avatarKey?: string | null
): ImageSourcePropType {
  if (photoURL) {
    return { uri: photoURL };
  }
  if (avatarKey && PRESET_AVATAR_MAP[avatarKey]) {
    return PRESET_AVATAR_MAP[avatarKey];
  }
  return DEFAULT_AVATAR;
}

export { PRESET_AVATAR_MAP, DEFAULT_AVATAR };
