import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

import { ensureUserProfile } from '../../../lib/auth';
import { auth, db } from '../../../lib/firebase';
import { loginStyles as styles } from './styles';

declare global {
  // eslint-disable-next-line no-var
  var _playlogLoginRecaptcha: RecaptchaVerifier | undefined;
}

const descriptionStyle = {
  color: '#94a3b8',
  fontSize: 14,
  lineHeight: 20,
};

const recaptchaWrapperStyle: ViewStyle = {
  alignSelf: 'flex-start',
  padding: 6,
  borderRadius: 12,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  borderWidth: 1,
  borderColor: 'rgba(148, 163, 184, 0.35)',
};

export function PhoneLogin() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const normalizeAu = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('04') && digits.length === 10) return `+61${digits.slice(1)}`;
    if (digits.startsWith('614') && digits.length === 11) return `+${digits}`;
    if (value.trim().startsWith('+61')) return value.trim();
    return value.trim();
  }, []);

  const e164Ok = useCallback((raw: string) => /^\+\d{6,15}$/.test(raw.trim()), []);

  const clearRecaptcha = useCallback(() => {
    if (globalThis._playlogLoginRecaptcha) {
      try {
        globalThis._playlogLoginRecaptcha.clear();
      } catch (recaptchaError) {
        console.warn('Failed to clear login reCAPTCHA instance', recaptchaError);
      }
      globalThis._playlogLoginRecaptcha = undefined;
    }
  }, []);

  useEffect(() => () => clearRecaptcha(), [clearRecaptcha]);

  const codeReady = useMemo(() => smsCode.trim().length === 6, [smsCode]);

  const handleSendCode = useCallback(async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const e164 = normalizeAu(phone);

    if (!e164Ok(e164)) {
      setErrorMessage('Enter a valid AU number in E.164 format (e.g. +61412345678).');
      return;
    }

    if (Platform.OS !== 'web') {
      setErrorMessage('Phone login is only available on the web preview right now.');
      return;
    }

    try {
      setSendingCode(true);
      clearRecaptcha();

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-login-container', {
        size: 'normal',
        callback: () => setErrorMessage(null),
        'expired-callback': () =>
          setErrorMessage('Verification expired. Please run the reCAPTCHA challenge again.'),
      });

      await recaptchaVerifier.render();
      globalThis._playlogLoginRecaptcha = recaptchaVerifier;

      const result = await signInWithPhoneNumber(auth, e164, recaptchaVerifier);
      setConfirmResult(result);
      setSmsSent(true);
      setInfoMessage('Verification code sent. Check your messages.');
    } catch (error) {
      let message = 'Failed to send the verification code. Please try again.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/missing-app-credential':
            message = 'Complete the reCAPTCHA challenge before requesting another code.';
            break;
          case 'auth/invalid-app-credential':
            message =
              'reCAPTCHA could not verify this site. Add the current domain in Firebase Authentication → Settings → Authorized domains and reload.';
            break;
          case 'auth/captcha-check-failed':
            message = 'reCAPTCHA verification failed. Refresh the widget and try again.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts right now. Wait a minute and try again.';
            break;
          default:
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      clearRecaptcha();
      setErrorMessage(message);
    } finally {
      setSendingCode(false);
    }
  }, [clearRecaptcha, e164Ok, normalizeAu, phone]);

  const handleVerifyCode = useCallback(async () => {
    if (!confirmResult || !codeReady) {
      setErrorMessage('Enter the SMS code we sent to your phone.');
      return;
    }

    try {
      setVerifyingCode(true);
      setErrorMessage(null);
      setInfoMessage(null);

      const credential = await confirmResult.confirm(smsCode.trim());
      const { user } = credential;

      const profileRef = doc(db, 'users', user.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        await signOut(auth).catch(() => {});
        setErrorMessage('No Playlog account matches that phone number. Sign up first to continue.');
        setSmsSent(false);
        setConfirmResult(null);
        setSmsCode('');
        clearRecaptcha();
        return;
      }

      await ensureUserProfile(user);
      clearRecaptcha();
      router.replace('/(tabs)/home');
    } catch (error) {
      let message = 'Unable to verify the SMS code. Please try again.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-verification-code':
          case 'auth/invalid-verification-id':
            message = 'That code looks incorrect. Re-enter the 6-digit code from your SMS.';
            break;
          case 'auth/code-expired':
            message = 'That code has expired. Request a new one to continue.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts. Wait a moment and try again.';
            break;
          default:
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error) {
        if (error.message === 'DISPLAY_NAME_MISSING') {
          message =
            'We could not load your display name. Contact support or sign up again to restore your profile.';
        } else if (error.message === 'USERNAME_CONFLICT') {
          message =
            'Your display name is already connected to another profile. Contact support so we can help restore it.';
        } else {
          message = error.message;
        }
      }

      setErrorMessage(message);
      await signOut(auth).catch(() => {});
    } finally {
      setVerifyingCode(false);
    }
  }, [clearRecaptcha, codeReady, confirmResult, router, smsCode]);

  return (
    <View style={styles.formCard}>
      <Text style={descriptionStyle}>We’ll send a 6-digit code to the phone number linked to your Playlog account.</Text>

      {Platform.OS === 'web' && (
        <View style={recaptchaWrapperStyle}>
          <View id="recaptcha-login-container" />
        </View>
      )}

      <View style={styles.formGrid}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone (AU)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+61412345678"
            placeholderTextColor="#475569"
            style={styles.input}
            keyboardType="phone-pad"
            autoComplete="tel"
            autoCapitalize="none"
          />
        </View>

        <Pressable
          onPress={handleSendCode}
          disabled={sendingCode || verifyingCode}
          style={({ pressed }) => [
            styles.primaryButton,
            (sendingCode || verifyingCode) && styles.submitDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {sendingCode ? (
            <ActivityIndicator color={sendingCode || verifyingCode ? '#475569' : '#0f172a'} />
          ) : (
            <>
              <Feather
                name="message-circle"
                size={16}
                color={sendingCode || verifyingCode ? '#475569' : '#0f172a'}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  (sendingCode || verifyingCode) && styles.primaryButtonTextDisabled,
                ]}
              >
                Send code
              </Text>
            </>
          )}
        </Pressable>

        {smsSent && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                value={smsCode}
                onChangeText={setSmsCode}
                placeholder="123456"
                placeholderTextColor="#475569"
                style={styles.input}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoCapitalize="none"
                maxLength={6}
              />
            </View>

            <Pressable
              onPress={handleVerifyCode}
              disabled={!codeReady || verifyingCode}
              style={({ pressed }) => [
                styles.primaryButton,
                (!codeReady || verifyingCode) && styles.submitDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {verifyingCode ? (
                <ActivityIndicator color={codeReady ? '#0f172a' : '#475569'} />
              ) : (
                <>
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={!codeReady ? '#475569' : '#0f172a'}
                  />
                  <Text
                    style={[styles.primaryButtonText, (!codeReady || verifyingCode) && styles.primaryButtonTextDisabled]}
                  >
                    Verify & sign in
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Feather name="alert-triangle" size={16} color="#f87171" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {infoMessage && (
          <View style={styles.infoBanner}>
            <Feather name="info" size={16} color="#38bdf8" />
            <Text style={styles.infoText}>{infoMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
