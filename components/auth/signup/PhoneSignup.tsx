import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  updateProfile,
  type ConfirmationResult,
} from 'firebase/auth';

import { ensureUserProfile } from '../../../lib/auth';
import { auth } from '../../../lib/firebase';
import { useTheme } from '../../../lib/theme';
import { createSignupStyles } from './styles';

interface PhoneSignupProps {
  onSuccess: (payload: { contact: string }) => void;
  onError: (message: string | null) => void;
  onVerificationError: (message: string | null) => void;
}

declare global {
  // eslint-disable-next-line no-var
  var _playlogRecaptcha: RecaptchaVerifier | undefined;
}

export function PhoneSignup({ onSuccess, onError, onVerificationError }: PhoneSignupProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createSignupStyles(colors, isDark), [colors, isDark]);
  const placeholderColor = colors.muted;
  const primaryContentColor = isDark ? colors.text : '#0f172a';
  const errorAccent = colors.danger;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const normalizeAu = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('04') && digits.length === 10) return `+61${digits.slice(1)}`;
    if (digits.startsWith('614') && digits.length === 11) return `+${digits}`;
    if (value.trim().startsWith('+61')) return value.trim();
    return value.trim();
  }, []);

  const e164Ok = useCallback((raw: string) => /^\+\d{6,15}$/.test(raw.trim()), []);

  const clearRecaptcha = useCallback(() => {
    if (globalThis._playlogRecaptcha) {
      try {
        globalThis._playlogRecaptcha.clear();
      } catch (recaptchaError) {
        console.warn('Failed to clear reCAPTCHA instance', recaptchaError);
      }
      globalThis._playlogRecaptcha = undefined;
    }
  }, []);

  useEffect(() => () => clearRecaptcha(), [clearRecaptcha]);

  const handleOpenTerms = useCallback(() => {
    void Linking.openURL('https://bipin12870.github.io/playlog-legal/terms.html');
  }, []);

  const handleSendCode = useCallback(async () => {
    setPhoneError(null);
    onError(null);

    const e164 = normalizeAu(phone);

    if (!termsAccepted) {
      setPhoneError('Please agree to the terms & conditions first.');
      return;
    }

    if (!e164Ok(e164)) {
      setPhoneError('Enter a valid AU number in E.164 format (e.g. +61412345678).');
      return;
    }

    try {
      setPhoneLoading(true);

      if (Platform.OS !== 'web') {
        setPhoneError('Phone sign-up is only available on the web preview right now.');
        setPhoneLoading(false);
        return;
      }

      clearRecaptcha();

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => setPhoneError(null),
        'expired-callback': () =>
          setPhoneError('Verification expired. Please run the reCAPTCHA challenge again.'),
      });

      await recaptchaVerifier.render();
      globalThis._playlogRecaptcha = recaptchaVerifier;

      const result = await signInWithPhoneNumber(auth, e164, recaptchaVerifier);
      setConfirmResult(result);
      setSmsSent(true);
      setPhoneError(null);
    } catch (err) {
      let message = 'Failed to send the verification code. Please try again.';
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/missing-app-credential') {
          message = 'Please complete the reCAPTCHA challenge before requesting another code.';
        } else if (err.code === 'auth/invalid-app-credential') {
          message =
            'reCAPTCHA could not verify this site. Add the current domain to Firebase Authentication → Settings → Authorized domains and reload.';
        } else if (err.code === 'auth/captcha-check-failed') {
          message = 'reCAPTCHA verification failed. Refresh the widget and try again.';
        } else if (err.code === 'auth/too-many-requests') {
          message = 'Too many attempts right now. Wait a minute and try again.';
        } else {
          message = err.message ?? message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      clearRecaptcha();
      setPhoneError(message);
    } finally {
      setPhoneLoading(false);
    }
  }, [e164Ok, normalizeAu, phone, termsAccepted]);

  const handleVerifyCode = useCallback(async () => {
    if (!confirmResult || smsCode.trim().length < 6) {
      return;
    }

    try {
      setPhoneLoading(true);
      const credential = await confirmResult.confirm(smsCode.trim());

      const displayName = fullName.trim();
      if (displayName.length > 1) {
        await updateProfile(credential.user, { displayName });
      }

      await ensureUserProfile(credential.user);

      onVerificationError(null);
      onError(null);
      onSuccess({ contact: credential.user.phoneNumber ?? normalizeAu(phone) });

      setSmsSent(false);
      setConfirmResult(null);
      setSmsCode('');
      setPhone('');
      setTermsAccepted(false);
      setFullName('');
      setPhoneError(null);
      clearRecaptcha();
      await signOut(auth).catch(() => {});
    } catch (err) {
      let message = 'Invalid code. Please try again.';
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/invalid-verification-code') {
          message = 'That code looks incorrect. Please re-enter the 6-digit SMS code.';
        } else {
          message = err.message ?? message;
        }
      } else if (err instanceof Error) {
        if (err.message === 'DISPLAY_NAME_MISSING') {
          message =
            'We could not read your display name. Add a name before finishing signup or try another method.';
        } else if (err.message === 'USERNAME_CONFLICT') {
          message =
            'That display name is already taken. Update it and try again, or contact support.';
        } else {
          message = err.message;
        }
      }
      setPhoneError(message);
      await signOut(auth).catch(() => {});
    } finally {
      setPhoneLoading(false);
    }
  }, [confirmResult, fullName, normalizeAu, onError, onSuccess, onVerificationError, phone, smsCode]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Sign up with phone</Text>
      <Text style={styles.formHint}>
        Enter your Australian mobile number and we’ll text you a verification code.
      </Text>

      {Platform.OS === 'web' && (
        <View style={styles.recaptchaWrapper}>
          <View id="recaptcha-container" />
        </View>
      )}

      <View style={styles.formGrid}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your display name"
            placeholderTextColor={placeholderColor}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone (AU)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="0403 984 897 or +61403984897"
            placeholderTextColor={placeholderColor}
            style={styles.input}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>
      </View>

      <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((prev) => !prev)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? <Feather name="check" size={16} color={primaryContentColor} /> : null}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the{' '}
          <Text style={styles.linkText} onPress={handleOpenTerms}>
            terms &amp; conditions
          </Text>
        </Text>
      </Pressable>

      {!smsSent ? (
        <Pressable
          style={[styles.primaryButton, (phoneLoading || !termsAccepted) && styles.submitDisabled]}
          onPress={handleSendCode}
          disabled={phoneLoading || !termsAccepted}
        >
          {phoneLoading ? (
            <ActivityIndicator color={primaryContentColor} />
          ) : (
            <>
              <Ionicons name="chatbubble-ellipses" size={18} color={primaryContentColor} />
              <Text style={styles.primaryButtonText}>Send verification code</Text>
            </>
          )}
        </Pressable>
      ) : (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SMS code</Text>
            <TextInput
              value={smsCode}
              onChangeText={setSmsCode}
              placeholder="123456"
              placeholderTextColor={placeholderColor}
              style={styles.input}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              styles.submitButton,
              (phoneLoading || smsCode.trim().length < 4) && styles.submitDisabled,
            ]}
            onPress={handleVerifyCode}
            disabled={phoneLoading || smsCode.trim().length < 4}
          >
            {phoneLoading ? (
              <ActivityIndicator color={primaryContentColor} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={primaryContentColor} />
                <Text style={styles.primaryButtonText}>Verify &amp; create account</Text>
              </>
            )}
          </Pressable>
        </>
      )}

      {phoneError && (
        <View style={styles.errorBanner}>
          <Feather name="alert-triangle" size={16} color={errorAccent} />
          <Text style={styles.errorText}>{phoneError}</Text>
        </View>
      )}
    </View>
  );
}
