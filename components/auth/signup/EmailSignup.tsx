import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth, db } from '../../../lib/firebase';
import { signupStyles as styles } from './styles';

interface EmailSignupProps {
  onSuccess: (payload: { email: string; verificationError?: string | null }) => void;
  onError: (message: string | null) => void;
}

export function EmailSignup({ onSuccess, onError }: EmailSignupProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }),
    [password],
  );
  const allPasswordChecksPass = useMemo(() => Object.values(passwordChecks).every(Boolean), [passwordChecks]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const canSubmitEmail =
    fullName.trim().length > 1 &&
    emailValid &&
    allPasswordChecksPass &&
    passwordsMatch &&
    termsAccepted;

  const handleOpenTerms = useCallback(() => {
    void Linking.openURL('https://bipin12870.github.io/playlog-legal/terms.html');
  }, []);

  const handleEmailSignup = async () => {
    if (!canSubmitEmail || loading) return;

    const displayName = fullName.trim();
    const normalizedUsername = displayName.toLowerCase();
    const emailValue = email.trim().toLowerCase();
    const usernameRef = doc(db, 'usernames', normalizedUsername);

    setLoading(true);
    onError(null);

    let userCreated = false;
    let verificationError: string | null = null;

    try {
      const usernameSnapshot = await getDoc(usernameRef);
      if (usernameSnapshot.exists()) {
        throw new Error('USERNAME_TAKEN');
      }

      const credential = await createUserWithEmailAndPassword(auth, emailValue, password);
      const { user } = credential;
      userCreated = true;

      await updateProfile(user, { displayName });

      try {
        await sendEmailVerification(user);
      } catch (error) {
        verificationError =
          'Account created, but we could not send the verification email. You can request a new link from the login screen.';
      }

      await signOut(auth).catch(() => {});

      onSuccess({
        email: user.email ?? emailValue,
        verificationError,
      });

      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTermsAccepted(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      let message = 'Unable to create your account. Please try again.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            message = 'That email is already linked to another Playlog account.';
            break;
          case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            message = 'Your password needs to meet every requirement before we can continue.';
            break;
          case 'auth/operation-not-allowed':
            message = 'Email sign up is currently disabled. Please try again later.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts. Wait a bit before trying again.';
            break;
          default:
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        message = 'That display name is already in use. Please choose another one.';
      } else if (error instanceof Error) {
        message = error.message;
      }

      onError(message);

      if (userCreated) {
        await signOut(auth).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Sign up with email</Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full name"
        placeholderTextColor="#b8bcc7"
        style={styles.input}
        autoCapitalize="words"
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#b8bcc7"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#b8bcc7"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          style={styles.inputField}
        />
        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
          <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#b8bcc7"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          style={styles.inputField}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
          <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.validationPanel}>
        <Text style={styles.validationTitle}>Password requirements</Text>
        <ValidationStatus passed={passwordChecks.length} text="At least 8 characters" />
        <ValidationStatus passed={passwordChecks.upper} text="One uppercase letter" />
        <ValidationStatus passed={passwordChecks.lower} text="One lowercase letter" />
        <ValidationStatus passed={passwordChecks.number} text="One number" />
        <ValidationStatus passed={passwordChecks.special} text="One special symbol" />
        <ValidationStatus passed={passwordsMatch} text="Passwords match" />
      </View>

      <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((prev) => !prev)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? <Feather name="check" size={16} color="#0f172a" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the{' '}
          <Text style={styles.linkText} onPress={handleOpenTerms}>
            terms &amp; conditions
          </Text>
        </Text>
      </Pressable>

      <Pressable
        onPress={handleEmailSignup}
        disabled={!canSubmitEmail || loading}
        style={[styles.primaryButton, (!canSubmitEmail || loading) && styles.submitDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={18} color="#0f172a" />
            <Text style={styles.primaryButtonText}>Create account</Text>
          </>
        )}
      </Pressable>
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
