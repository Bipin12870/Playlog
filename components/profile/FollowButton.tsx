import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useFollowState } from '../../lib/hooks/useFollowState';

type FollowButtonProps = {
  targetUid: string;
  currentUid?: string | null;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium';
  variant?: 'primary' | 'secondary';
  onAuthRequired?: () => void;
  onError?: (error: Error) => void;
};

export function FollowButton({
  targetUid,
  currentUid,
  style,
  labelStyle,
  size = 'medium',
  variant = 'primary',
  onAuthRequired,
  onError,
}: FollowButtonProps) {
  const { user } = useAuthUser();
  const resolvedUid = currentUid ?? user?.uid ?? null;
  const isSelf = resolvedUid === targetUid;

  const { isFollowing, hasPendingRequest, loading, processing, error, toggle, canFollow } =
    useFollowState({
      currentUid: resolvedUid,
      targetUid,
    });

  useEffect(() => {
    if (error && onError) {
      onError(error instanceof Error ? error : new Error('FOLLOW_ERROR'));
    }
  }, [error, onError]);

  if (!targetUid || isSelf) {
    return null;
  }

  const disabled = processing || loading;

  const handlePress = () => {
    if (disabled) {
      return;
    }
    if (!resolvedUid) {
      onAuthRequired?.();
      return;
    }
    if (!canFollow) {
      return;
    }
    toggle();
  };

  const label = processing
    ? 'Saving…'
    : hasPendingRequest
      ? 'Requested'
      : isFollowing
        ? 'Following'
        : 'Follow';

  const buttonStyles: StyleProp<ViewStyle> = [
    styles.buttonBase,
    size === 'small' ? styles.buttonSmall : styles.buttonMedium,
    hasPendingRequest
      ? styles.buttonRequested
      : isFollowing
        ? styles.buttonSecondary
        : styles.buttonPrimary,
    variant === 'secondary' && !isFollowing && !hasPendingRequest ? styles.buttonSecondary : null,
    (!canFollow || disabled) && styles.buttonDisabled,
    style,
  ];

  const labelStyles: StyleProp<TextStyle> = [
    styles.labelBase,
    hasPendingRequest
      ? styles.labelRequested
      : isFollowing
        ? styles.labelSecondary
        : styles.labelPrimary,
    variant === 'secondary' && !isFollowing && !hasPendingRequest ? styles.labelSecondary : null,
    (!canFollow || disabled) && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isFollowing
          ? 'Unfollow user'
          : hasPendingRequest
            ? 'Cancel follow request'
            : 'Follow user'
      }
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        buttonStyles,
        pressed && !processing && !loading && resolvedUid && styles.buttonPressed,
      ]}
    >
      <View style={styles.contentRow}>
        {(processing || loading) && (
          <ActivityIndicator
            size="small"
            color={hasPendingRequest || isFollowing ? '#1f2937' : '#f9fafb'}
            style={styles.spinner}
          />
        )}
      <Text style={labelStyles}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonMedium: {
    minHeight: 40,
  },
  buttonSmall: {
    minHeight: 32,
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    backgroundColor: '#6366f1',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  buttonRequested: {
    backgroundColor: '#e0e7ff',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  labelBase: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelPrimary: {
    color: '#f9fafb',
  },
  labelSecondary: {
    color: '#1f2937',
  },
  labelRequested: {
    color: '#1f2937',
  },
  labelDisabled: {
    color: '#9ca3af',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  spinner: {
    marginRight: 4,
  },
});

export default FollowButton;
