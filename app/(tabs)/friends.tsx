import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FollowList } from '../../components/profile';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import { useUserSearch } from '../../lib/hooks/useUserSearch';
import { useBlockRelationships } from '../../lib/hooks/useBlockRelationships';
import { useTheme, type ThemeColors } from '../../lib/theme';
import type { FollowEdge } from '../../types/follow';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors, statusBarStyle, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const mutedIcon = colors.muted;
  const subtleIcon = colors.subtle;
  const { user } = useAuthUser();
  const { submittedTerm, submissionId, setScope } = useGameSearch();
  const blockRelationships = useBlockRelationships(user?.uid ?? null);
  const isWeb = Platform.OS === 'web';
  const [activeQuery, setActiveQuery] = useState('');
  const [mobileTerm, setMobileTerm] = useState('');

  useEffect(() => {
    setScope('friends');
  }, [setScope]);

  useEffect(() => {
    if (isWeb) {
      setActiveQuery(submittedTerm.trim());
    }
  }, [submittedTerm, submissionId, isWeb]);

  const minLength = 2;
  const querySource = isWeb ? activeQuery : mobileTerm;
  const trimmedQuery = querySource.trim();
  const hasQuery = trimmedQuery.length >= minLength;

  const search = useUserSearch(hasQuery ? trimmedQuery : '', {
    excludeUid: user?.uid ?? null,
    debounceMs: 0,
    excludeUids: blockRelationships.combinedBlockedIds,
  });

  const edges: FollowEdge[] = useMemo(
    () =>
      search.results.map((item) => ({
        ...item,
        followedAt: null,
        mutual: null,
      })),
    [search.results],
  );

  const handleAuthRequired = () => {
    router.push('/login');
  };

  const handleSelectUser = (selected: FollowEdge) => {
    router.push(`/profile/${selected.uid}`);
  };

  const promptCopy = isWeb
    ? 'Use the search bar above to look up friends.'
    : 'Use the field below to find players to follow.';
  const placeholderCopy = 'Search by name or username';

  if (!isWeb) {
    return (
      <SafeAreaView style={styles.mobileSafe}>
        <StatusBar barStyle={statusBarStyle} />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.mobileSafe}
        >
          <View style={styles.mobileContainer}>
            <View style={styles.mobileHeader}>
              <Text style={styles.mobileTitle}>Find friends</Text>
              <Text style={styles.mobileSubtitle}>
                Search for players and follow what they’re playing.
              </Text>
            </View>

            <View style={styles.mobileSearchRow}>
              <Ionicons name="search" size={18} color={mutedIcon} />
              <TextInput
                value={mobileTerm}
                onChangeText={setMobileTerm}
                placeholder={placeholderCopy}
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.mobileSearchInput}
                returnKeyType="search"
              />
              {mobileTerm.length > 0 ? (
                <Pressable onPress={() => setMobileTerm('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={mutedIcon} />
                </Pressable>
              ) : null}
            </View>

            {search.error ? (
              <Text style={styles.mobileErrorText}>{search.error.message}</Text>
            ) : null}

            {hasQuery ? (
              <View style={styles.mobileResultsCard}>
                <FollowList
                  edges={edges}
                  loading={search.loading}
                  currentUid={user?.uid ?? null}
                  emptyLabel="No players match that search."
                  onAuthRequired={handleAuthRequired}
                  onSelectUser={handleSelectUser}
                  theme={isDark ? 'dark' : 'light'}
                  showBlockAction
                />
              </View>
            ) : (
              <View style={styles.mobileEmptyPrompt}>
                <Ionicons name="people-outline" size={40} color={subtleIcon} />
                <Text style={styles.mobilePromptTitle}>Search for players</Text>
                <Text style={styles.mobilePromptCopy}>{promptCopy}</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.wrapper}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find friends</Text>
          <Text style={styles.subtitle}>Search for players and follow what they’re playing.</Text>
        </View>

        {search.error ? <Text style={styles.errorText}>{search.error.message}</Text> : null}

        {!hasQuery ? (
          <View style={styles.emptyPrompt}>
            <Ionicons name="people-outline" size={40} color={subtleIcon} />
            <Text style={styles.promptTitle}>Search for players</Text>
            <Text style={styles.promptCopy}>{promptCopy}</Text>
          </View>
        ) : (
          <View style={styles.resultsWrapper}>
            <FollowList
              edges={edges}
              loading={search.loading}
              currentUid={user?.uid ?? null}
              emptyLabel="No players match that search."
              onAuthRequired={handleAuthRequired}
              onSelectUser={handleSelectUser}
              theme={isDark ? 'dark' : 'light'}
              showBlockAction
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const borderColor = colors.border;
  const surface = colors.surface;
  const surfaceSecondary = colors.surfaceSecondary;
  const subtleText = isDark ? colors.subtle : colors.muted;

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 32,
      backgroundColor: colors.background,
    },
    header: {
      marginBottom: 12,
      gap: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    resultsWrapper: {
      flex: 1,
      backgroundColor: surface,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor,
    },
    emptyPrompt: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    promptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    promptCopy: {
      fontSize: 14,
      color: subtleText,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
    },
    mobileSafe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mobileContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 24,
      gap: 16,
      backgroundColor: colors.background,
    },
    mobileHeader: {
      gap: 6,
    },
    mobileTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    mobileSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    mobileSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: surfaceSecondary,
      borderWidth: 1,
      borderColor,
    },
    mobileSearchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
    },
    mobileErrorText: {
      color: colors.danger,
      fontSize: 14,
    },
    mobileResultsCard: {
      flex: 1,
      borderRadius: 24,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor,
      overflow: 'hidden',
    },
    mobileEmptyPrompt: {
      flex: 1,
      borderRadius: 24,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    mobilePromptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    mobilePromptCopy: {
      fontSize: 14,
      color: subtleText,
      textAlign: 'center',
    },
  });
}
