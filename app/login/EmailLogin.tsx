import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from '../../lib/firebase';
import { ensureUserProfile } from '../../lib/auth';
import { loginStyles as styles } from './styles';

export function EmailLogin() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !loading;

  const handleEmailLogin = async () => {
    if (!canSubmit) return;

    const emailValue = email.trim().toLowerCase();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, emailValue, password);
      const { user } = credential;

      if (!user.emailVerified) {
        await sendEmailVerification(user).catch(() => {});
        setPendingVerificationEmail(user.email ?? emailValue);
        setInfoMessage('Verify your email to access Playlog. We just sent you a fresh link.');
        await signOut(auth).catch(() => {});
        return;
      }

      const displayName = user.displayName?.trim();
      if (!displayName) {
        throw new Error('DISPLAY_NAME_MISSING');
      }

      await ensureUserProfile(user);
      router.replace('/(tabs)/home');
    } catch (error) {
      let message = 'Unable to log you in. Please try again.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            message = 'That email address does not look right.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            message = 'Email or password is incorrect.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts. Wait a minute before trying again.';
            break;
          default:
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error) {
        if (error.message === 'DISPLAY_NAME_MISSING') {
          message =
            'We could not load your display name. Please contact support or sign up again to set one.';
        } else if (error.message === 'USERNAME_CONFLICT') {
          message =
            'Your display name is already linked to another profile. Contact support so we can help restore it.';
        } else {
          message = error.message;
        }
      }

      setErrorMessage(message);
      await signOut(auth).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;

    try {
      setResendLoading(true);
      const credential = await signInWithEmailAndPassword(auth, pendingVerificationEmail, password);
      await sendEmailVerification(credential.user);
      setInfoMessage('Verification email resent. Check your inbox!');
    } catch (error) {
      setErrorMessage('Could not resend verification. Try again in a moment.');
    } finally {
      await signOut(auth).catch(() => {});
      setResendLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailValid) {
      setErrorMessage('Enter the email linked to your account so we can send a reset link.');
      return;
    }

    const emailValue = email.trim().toLowerCase();
    setErrorMessage(null);
    setInfoMessage(null);
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, emailValue);
      setInfoMessage('Password reset link sent. Check your inbox to continue.');
    } catch (error) {
      let message = 'Unable to send the reset link. Try again later.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
            message = 'No account exists with that email address.';
            break;
          case 'auth/invalid-email':
            message = 'That email address does not look right.';
            break;
          default:
            message = error.message ?? message;
            break;
        }
      }
      setErrorMessage(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.formGrid}>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Email</Text>
            {email.length > 0 && (
              <ValidationStatus passed={emailValid} text={emailValid ? 'Looks valid' : 'Invalid email'} />
            )}
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="user@playlog.gg"
            placeholderTextColor="#475569"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#475569"
              secureTextEntry={!showPassword}
              style={styles.inputField}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, styles.submitButton, !canSubmit && styles.submitDisabled]}
          disabled={!canSubmit}
          onPress={handleEmailLogin}
        >
          {loading ? (
            <ActivityIndicator color={canSubmit ? '#0f172a' : '#475569'} />
          ) : (
            <>
              <Ionicons name="enter-outline" size={18} color={canSubmit ? '#0f172a' : '#475569'} />
              <Text style={[styles.primaryButtonText, !canSubmit && styles.primaryButtonTextDisabled]}>
                Sign in
              </Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.forgotRow} onPress={handlePasswordReset} disabled={resetLoading}>
          {resetLoading ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <Text style={styles.forgotText}>Forgot password?</Text>
          )}
        </Pressable>

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

        {pendingVerificationEmail && (
          <Pressable
            style={[styles.secondaryButton, styles.resendButton]}
            onPress={handleResendVerification}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#38bdf8" />
            ) : (
              <>
                <Feather name="mail" size={16} color="#38bdf8" />
                <Text style={styles.secondaryButtonText}>Resend verification</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ValidationStatus({ passed, text }: { passed: boolean; text: string }) {
  return (
    <View style={styles.validationRow}>
      <Feather name={passed ? 'check-circle' : 'circle'} size={16} color={passed ? '#22c55e' : '#475569'} />
      <Text style={[styles.validationText, passed && styles.validationTextPassed]}>{text}</Text>
    </View>
  );
}
