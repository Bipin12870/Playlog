import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { FollowList } from '../../components/profile';
import { useAuthUser } from '../../lib/hooks/useAuthUser';
import { useGameSearch } from '../../lib/hooks/useGameSearch';
import { useUserSearch } from '../../lib/hooks/useUserSearch';
import type { FollowEdge } from '../../types/follow';

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { submittedTerm, submissionId, setScope } = useGameSearch();
  const [activeQuery, setActiveQuery] = useState('');

  useEffect(() => {
    setScope('friends');
  }, [setScope]);

  useEffect(() => {
    setActiveQuery(submittedTerm.trim());
  }, [submittedTerm, submissionId]);

  const minLength = 2;
  const hasQuery = activeQuery.length >= minLength;

  const search = useUserSearch(hasQuery ? activeQuery : '', {
    excludeUid: user?.uid ?? null,
    debounceMs: 0,
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

  const promptCopy = 'Use the search bar above to look up friends.';

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
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  resultsWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  promptCopy: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});
