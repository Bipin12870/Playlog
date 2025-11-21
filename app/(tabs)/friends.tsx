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
import type { FollowEdge } from '../../types/follow';

const PAGE_BG = '#0f172a';
const SURFACE_BG = '#0b1120';
const TEXT = '#f8fafc';
const MUTED = '#94a3b8';

export default function FriendsScreen() {
  const router = useRouter();
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
        <StatusBar barStyle="light-content" />
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
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                value={mobileTerm}
                onChangeText={setMobileTerm}
                placeholder={placeholderCopy}
                placeholderTextColor="#94a3b8"
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.mobileSearchInput}
                returnKeyType="search"
              />
              {mobileTerm.length > 0 ? (
                <Pressable onPress={() => setMobileTerm('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
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
                  theme="dark"
                  showBlockAction
                />
              </View>
            ) : (
              <View style={styles.mobileEmptyPrompt}>
                <Ionicons name="people-outline" size={40} color="#cbd5f5" />
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
            <Ionicons name="people-outline" size={40} color="#cbd5f5" />
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
              theme="dark"
              showBlockAction
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    backgroundColor: PAGE_BG,
  },
  header: {
    marginBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
  },
  resultsWrapper: {
    flex: 1,
    backgroundColor: SURFACE_BG,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
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
    color: TEXT,
  },
  promptCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  mobileSafe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  mobileContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
    backgroundColor: PAGE_BG,
  },
  mobileHeader: {
    gap: 6,
  },
  mobileTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  mobileSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  mobileSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  mobileSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
  },
  mobileErrorText: {
    color: '#f87171',
    fontSize: 14,
  },
  mobileResultsCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    overflow: 'hidden',
  },
  mobileEmptyPrompt: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  mobilePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  mobilePromptCopy: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
  },
});
