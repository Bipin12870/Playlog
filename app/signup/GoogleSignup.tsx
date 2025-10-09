import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';

import { signInWithGoogleCredential } from '../../lib/auth';
import { signupStyles as styles } from './styles';

interface GoogleSignupProps {
  onError: (message: string | null) => void;
  onVerificationError: (message: string | null) => void;
}

export function GoogleSignup({ onError, onVerificationError }: GoogleSignupProps) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
  const googleButtonDisabled = googleLoading || !termsAccepted || googleButtonInactive;

  const finalizeGoogleSignIn = useCallback(
    async ({
      idToken,
      accessToken,
    }: {
      idToken?: string | null;
      accessToken?: string | null;
    }) => {
      try {
        onError(null);
        onVerificationError(null);
        await signInWithGoogleCredential({ idToken, accessToken });
        router.replace('/(tabs)/home');
      } catch (error) {
        let message = 'Unable to sign you up with Google. Please try again.';

        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/account-exists-with-different-credential':
              message =
                'That email is already linked to a different sign-in method. Try logging in with email or reset your password.';
              break;
            case 'auth/popup-blocked':
            case 'auth/popup-closed-by-user':
              message = 'Google sign-in was closed before finishing. Please try again.';
              break;
            default:
              message = error.message ?? message;
              break;
          }
        } else if (error instanceof Error) {
          if (error.message === 'USERNAME_CONFLICT') {
            message =
              'Your Google display name is already taken. Update it in Google or contact support to continue.';
          } else if (error.message === 'DISPLAY_NAME_MISSING') {
            message =
              'We could not read your Google display name. Please add a name to your Google profile and try again.';
          } else if (error.message === 'GOOGLE_CREDENTIAL_MISSING') {
            message = 'Google did not provide the expected sign-in token. Please try again.';
          } else {
            message = error.message;
          }
        }

        onError(message);
      } finally {
        setGoogleLoading(false);
      }
    },
    [onError, onVerificationError, router],
  );

  useEffect(() => {
    if (!googleResponse) return;

    const run = async () => {
      if (googleResponse.type === 'success') {
        await finalizeGoogleSignIn({
          idToken: googleResponse.params?.id_token ?? googleResponse.authentication?.idToken,
          accessToken: googleResponse.authentication?.accessToken,
        });
      } else if (googleResponse.type === 'error') {
        onError('Google sign-in failed. Please try again.');
        setGoogleLoading(false);
      } else {
        setGoogleLoading(false);
      }
    };

    run();
  }, [finalizeGoogleSignIn, googleResponse, onError]);

  const handleGoogleSignup = async () => {
    if (!googleClientConfigured) {
      onError('Google sign-in is not configured. Please add your client IDs in the environment file.');
      return;
    }

    if (!termsAccepted) {
      onError('Please agree to the terms and conditions before continuing.');
      return;
    }

    if (googleLoading) {
      return;
    }

    if (!googleRequest) {
      onError('Google sign-in is still initializing. Please try again in a moment.');
      return;
    }

    try {
      onError(null);
      onVerificationError(null);
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
      onError(message);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Sign up with Google</Text>
      <Text style={styles.formHint}>
        We’ll open Google to verify your account. By continuing you agree to our terms.
      </Text>

      <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((prev) => !prev)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? <Feather name="check" size={16} color="#0f172a" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the <Text style={styles.linkText}>terms &amp; conditions</Text>
        </Text>
      </Pressable>

      <Pressable
        onPress={handleGoogleSignup}
        disabled={googleButtonDisabled}
        style={[styles.primaryButton, (googleButtonDisabled || googleButtonInactive) && styles.submitDisabled]}
      >
        {googleLoading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#0f172a" />
            <Text style={styles.primaryButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
