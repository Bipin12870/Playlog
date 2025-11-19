import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';

import { signInWithGoogleCredential } from '../../../lib/auth';
import { loginStyles as styles } from './styles';

const descriptionStyle = {
  color: '#94a3b8',
  fontSize: 14,
  lineHeight: 20,
};

export function GoogleLogin() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const googleConfig: Partial<Google.GoogleAuthRequestConfig> = useMemo(
    () => ({
      ...(expoClientId
        ? { clientId: expoClientId }
        : webClientId
          ? { clientId: webClientId }
          : {}),
      ...(webClientId ? { webClientId } : {}),
      ...(iosClientId ? { iosClientId } : {}),
      ...(androidClientId ? { androidClientId } : {}),
    }),
    [androidClientId, expoClientId, iosClientId, webClientId],
  );

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(googleConfig);

  const googleClientConfigured = useMemo(
    () =>
      Boolean(
        googleConfig.clientId ||
          googleConfig.webClientId ||
          googleConfig.iosClientId ||
          googleConfig.androidClientId,
      ),
    [googleConfig],
  );

  const googleButtonInactive = !googleClientConfigured || !googleRequest;
  const googleButtonDisabled = googleLoading || googleButtonInactive;

  const finalizeGoogleLogin = useCallback(
    async ({
      idToken,
      accessToken,
    }: {
      idToken?: string | null;
      accessToken?: string | null;
    }) => {
      try {
        setErrorMessage(null);
        await signInWithGoogleCredential({ idToken, accessToken }, { requireExistingProfile: true });
        router.replace('/(tabs)/home');
      } catch (error) {
        let message = 'Unable to sign you in with Google. Please try again.';

        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/account-exists-with-different-credential':
              message =
                'That email is linked to a different sign-in method. Try another login option or reset your password.';
              break;
            case 'auth/popup-blocked':
            case 'auth/popup-closed-by-user':
              message = 'Google sign-in was closed before finishing. Please try again.';
              break;
            case 'auth/user-disabled':
              message = 'Your account is disabled. Contact support to regain access.';
              break;
            default:
              message = error.message ?? message;
              break;
          }
        } else if (error instanceof Error) {
          if (error.message === 'USERNAME_CONFLICT') {
            message =
              'Your Google display name is already connected to another profile. Contact support so we can restore access.';
          } else if (error.message === 'DISPLAY_NAME_MISSING') {
            message = 'We could not read your Google display name. Update it in Google and try again.';
          } else if (error.message === 'GOOGLE_PROFILE_MISSING') {
            message = 'No Playlog account matches that Google profile. Sign up first to continue.';
          } else if (error.message === 'GOOGLE_CREDENTIAL_MISSING') {
            message = 'Google did not provide the expected sign-in token. Please try again.';
          } else {
            message = error.message;
          }
        }

        setErrorMessage(message);
      } finally {
        setGoogleLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!googleResponse) return;

    const run = async () => {
      if (googleResponse.type === 'success') {
        await finalizeGoogleLogin({
          idToken: googleResponse.params?.id_token ?? googleResponse.authentication?.idToken,
          accessToken: googleResponse.authentication?.accessToken,
        });
      } else if (googleResponse.type === 'error') {
        setErrorMessage('Google sign-in failed. Please try again.');
        setGoogleLoading(false);
      } else {
        setGoogleLoading(false);
      }
    };

    run();
  }, [finalizeGoogleLogin, googleResponse]);

  const handleGoogleLogin = async () => {
    if (!googleClientConfigured) {
      setErrorMessage('Google sign-in is not configured. Add your client IDs in the environment file.');
      return;
    }

    if (!googleRequest) {
      setErrorMessage('Google sign-in is still initializing. Please try again in a moment.');
      return;
    }

    if (googleLoading) {
      return;
    }

    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      await promptGoogle({
        showInRecents: true,
      });
    } catch (error) {
      setGoogleLoading(false);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to open Google sign-in. Please try again.';
      setErrorMessage(message);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={descriptionStyle}>Sign in with your Google account to jump back into Playlog.</Text>

      <Pressable
        onPress={handleGoogleLogin}
        disabled={googleButtonDisabled}
        style={[styles.primaryButton, (googleButtonDisabled || googleButtonInactive) && styles.submitDisabled]}
      >
        {googleLoading ? (
          <ActivityIndicator color={googleButtonDisabled ? '#475569' : '#0f172a'} />
        ) : (
          <>
            <Ionicons
              name="logo-google"
              size={18}
              color={googleButtonDisabled ? '#475569' : '#0f172a'}
            />
            <Text style={[styles.primaryButtonText, googleButtonDisabled && styles.primaryButtonTextDisabled]}>
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Feather name="alert-triangle" size={16} color="#f87171" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
}
