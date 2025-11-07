import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useBlockState } from '../../lib/hooks/useBlockState';

type BlockButtonProps = {
  targetUid: string;
  currentUid?: string | null;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium';
  mode?: 'toggle' | 'unblock';
  onAuthRequired?: () => void;
  onError?: (error: Error) => void;
};

export function BlockButton({
  targetUid,
  currentUid,
  style,
  labelStyle,
  size = 'medium',
  mode = 'toggle',
  onAuthRequired,
  onError,
}: BlockButtonProps) {
  const { user } = useAuthUser();
  const resolvedUid = currentUid ?? user?.uid ?? null;
  const isSelf = resolvedUid === targetUid;

  const {
    isBlocked,
    loading,
    processing,
    error,
    canBlock,
    block,
    unblock,
  } = useBlockState({
    currentUid: resolvedUid,
    targetUid,
  });

  useEffect(() => {
    if (error && onError) {
      onError(error instanceof Error ? error : new Error('BLOCK_ERROR'));
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
    if (!canBlock) {
      return;
    }

    if (mode === 'unblock' || isBlocked) {
      void unblock();
    } else {
      void block();
    }
  };

  const shouldShowUnblock = mode === 'unblock' || isBlocked;
  const label = processing
    ? 'Saving…'
    : shouldShowUnblock
      ? 'Unblock'
      : 'Block';

  const buttonStyles: StyleProp<ViewStyle> = [
    styles.buttonBase,
    size === 'small' ? styles.buttonSmall : styles.buttonMedium,
    shouldShowUnblock ? styles.buttonSecondary : styles.buttonDanger,
    (!canBlock || disabled) && styles.buttonDisabled,
    style,
  ];

  const labelStyles: StyleProp<TextStyle> = [
    styles.labelBase,
    shouldShowUnblock ? styles.labelSecondary : styles.labelDanger,
    (!canBlock || disabled) && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shouldShowUnblock ? 'Unblock user' : 'Block user'}
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        buttonStyles,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <View style={styles.contentRow}>
        {(processing || loading) && (
          <ActivityIndicator
            size="small"
            color={shouldShowUnblock ? '#1f2937' : '#f9fafb'}
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
  buttonDanger: {
    backgroundColor: '#dc2626',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
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
  labelDanger: {
    color: '#f9fafb',
  },
  labelSecondary: {
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

export default BlockButton;
