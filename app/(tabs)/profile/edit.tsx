import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthUser } from '../../../lib/hooks/useAuthUser';
import { updateUserProfile, useUserProfile } from '../../../lib/userProfile';

type AvatarOption = {
  key: string;
  label: string;
  source: ImageSourcePropType;
};

const PRESET_AVATARS: AvatarOption[] = [
  { key: 'mario', label: 'Hero', source: require('../../../assets/mario.png') },
  { key: 'party', label: 'Party', source: require('../../../assets/characters.png') },
  { key: 'runner', label: 'Runner', source: require('../../../assets/runners.png') },
  { key: 'glare', label: 'Glare', source: require('../../../assets/glare.png') },
];

const PRESET_AVATAR_MAP = PRESET_AVATARS.reduce<Record<string, ImageSourcePropType>>(
  (acc, option) => {
    acc[option.key] = option.source;
    return acc;
  },
  {},
);

function formatJoined(dateValue?: Timestamp | Date | null) {
  if (!dateValue) return null;
  const date =
    dateValue instanceof Timestamp
      ? dateValue.toDate()
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EditProfileScreen() {
  const { user, initializing } = useAuthUser();
  const uid = user?.uid ?? null;
  const { profile, loading, error } = useUserProfile(uid);

  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      setDisplayName('');
      setPhotoUrl('');
      setBio('');
      setSelectedAvatar(null);
      setProfileVisibility('public');
      return;
    }
    setDisplayName(profile.displayName ?? '');
    setPhotoUrl(profile.photoURL ?? '');
    setBio(profile.bio ?? '');
    setSelectedAvatar(profile.avatarKey ?? null);
    setProfileVisibility(profile.profileVisibility === 'private' ? 'private' : 'public');
  }, [profile?.uid, profile?.displayName, profile?.photoURL, profile?.bio, profile?.avatarKey]);

  const trimmedDisplayName = displayName.trim();
  const trimmedBio = bio.trim();
  const trimmedPhoto = photoUrl.trim();
  const presetSource = selectedAvatar ? PRESET_AVATAR_MAP[selectedAvatar] : null;
  const fallbackPresetSource =
    !selectedAvatar && !trimmedPhoto && profile?.avatarKey
      ? PRESET_AVATAR_MAP[profile.avatarKey]
      : null;
  let previewSource: ImageSourcePropType | null = null;
  if (presetSource) {
    previewSource = presetSource;
  } else if (trimmedPhoto) {
    previewSource = { uri: trimmedPhoto };
  } else if (profile?.photoURL) {
    previewSource = { uri: profile.photoURL };
  } else if (fallbackPresetSource) {
    previewSource = fallbackPresetSource;
  }

  const originalDisplay = profile?.displayName ?? '';
  const originalBio = profile?.bio ?? '';
  const originalPhoto = profile?.photoURL ?? '';
  const originalAvatar = profile?.avatarKey ?? null;
  const originalVisibility = profile?.profileVisibility ?? 'public';

  const hasChanges =
    !!profile &&
    (trimmedDisplayName !== originalDisplay ||
      trimmedBio !== originalBio ||
      trimmedPhoto !== originalPhoto ||
      selectedAvatar !== originalAvatar ||
      profileVisibility !== originalVisibility);

  const canSubmit = hasChanges && !saving && trimmedDisplayName.length > 1;

  const joined = useMemo(() => formatJoined(profile?.createdAt ?? null), [profile?.createdAt]);

  const handleSave = async () => {
    if (!uid || !canSubmit) return;
    setSaving(true);
    setFeedback(null);

    try {
      await updateUserProfile({
        displayName: trimmedDisplayName,
        bio: trimmedBio,
        photoURL: selectedAvatar ? null : trimmedPhoto.length ? trimmedPhoto : null,
        avatarKey: selectedAvatar,
        profileVisibility,
      });
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      let message = 'Unable to update your profile.';
      if (err instanceof Error) {
        if (err.message === 'USERNAME_CONFLICT') {
          message = 'That display name is already taken. Try another one.';
        } else if (err.message === 'AUTH_REQUIRED') {
          message = 'You need to be signed in to update your profile.';
        } else if (err.message === 'PROFILE_MISSING') {
          message = 'Profile record not found.';
        } else {
          message = err.message;
        }
      }
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setPhotoUrl(profile.photoURL ?? '');
    setBio(profile.bio ?? '');
    setSelectedAvatar(profile.avatarKey ?? null);
    setProfileVisibility(profile.profileVisibility === 'private' ? 'private' : 'public');
    setFeedback(null);
  };

  if (initializing || loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile details…</Text>
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to edit your profile</Text>
        <Text style={styles.emptyCopy}>
          Log in to customise your Playlog presence. Update your display name, avatar, and bio once
          you’re signed in.
        </Text>
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarWrapper}>
            {previewSource ? (
              <Image source={previewSource} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={42} color="#1f2937" />
            )}
          </View>
          <View style={styles.heroDetails}>
            <Text style={styles.displayName}>{trimmedDisplayName || profile.displayName}</Text>
            <Text style={styles.heroSubtitle}>
              {joined ? `Joined ${joined}` : 'Keep your profile up to date.'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Profile details</Text>

        <View style={styles.fieldGroup}>
          <View style={styles.visibilityRow}>
            <View style={styles.visibilityCopy}>
              <Text style={styles.fieldLabel}>Profile visibility</Text>
              <Text style={styles.helperText}>
                Choose who can see your favourites, followers, and reviews.
              </Text>
            </View>
            <View style={styles.visibilityToggle}>
              <Text style={styles.visibilityBadge}>
                {profileVisibility === 'private' ? 'Private' : 'Public'}
              </Text>
              <Switch
                value={profileVisibility === 'private'}
                onValueChange={(value) => {
                  setProfileVisibility(value ? 'private' : 'public');
                  setFeedback(null);
                }}
                thumbColor={profileVisibility === 'private' ? '#f8fafc' : '#1f2937'}
                trackColor={{ false: '#4b5563', true: '#6366f1' }}
              />
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setFeedback(null);
            }}
            placeholder="Player name"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            maxLength={32}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Preset avatars</Text>
          <View style={styles.presetGrid}>
            {PRESET_AVATARS.map((option) => {
              const isSelected = selectedAvatar === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.presetChoice,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    setSelectedAvatar(option.key);
                    setPhotoUrl('');
                    setFeedback(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${option.label} avatar`}
                >
                  <View
                    style={[
                      styles.presetOption,
                      isSelected && styles.presetOptionActive,
                    ]}
                  >
                    <Image source={option.source} style={styles.presetImage} />
                  </View>
                  <Text
                    style={[
                      styles.presetLabel,
                      isSelected && styles.presetLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [
                styles.presetChoice,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                setSelectedAvatar(null);
                setPhotoUrl('');
                setFeedback(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Use default avatar icon"
            >
              <View
                style={[
                  styles.presetOption,
                  !selectedAvatar && !trimmedPhoto && styles.presetOptionActive,
                ]}
              >
                <Ionicons name="person" size={28} color="#94a3b8" />
              </View>
              <Text
                style={[
                  styles.presetLabel,
                  !selectedAvatar && !trimmedPhoto && styles.presetLabelActive,
                ]}
              >
                Default
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Avatar URL</Text>
          <TextInput
            value={photoUrl}
            onChangeText={(text) => {
              setPhotoUrl(text);
              setSelectedAvatar(null);
              setFeedback(null);
            }}
            placeholder="https://…"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            Choose a preset above or paste a custom image URL. Leaving this blank keeps the default.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={(text) => {
              setBio(text);
              setFeedback(null);
            }}
            placeholder="Share a short status or favourite games."
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.multilineInput]}
            multiline
            numberOfLines={3}
            maxLength={160}
          />
        </View>

        {feedback ? (
          <Text style={feedback.type === 'success' ? styles.successText : styles.errorText}>
            {feedback.message}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleReset}
            disabled={!hasChanges}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              !hasChanges && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryLabel}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
              !canSubmit && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#f8fafc" size="small" />
            ) : (
              <Text style={styles.primaryLabel}>Save changes</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    gap: 24,
    backgroundColor: '#0f172a',
  },
  heroCard: {
    backgroundColor: '#374151',
    borderRadius: 24,
    padding: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heroDetails: {
    flex: 1,
    gap: 6,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#cbd5f5',
  },
  formCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111827',
    color: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#374151',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  visibilityCopy: {
    flex: 1,
    gap: 4,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityBadge: {
    color: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  presetChoice: {
    alignItems: 'center',
    gap: 8,
  },
  presetOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#1d1f2f',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  presetLabelActive: {
    color: '#e0e7ff',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  successText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
  },
});
