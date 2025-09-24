// React hooks used for memoized values and local state.
import { useMemo, useState } from 'react';
// React Native view and input components used on the login screen.
import {
  View, // Basic layout wrapper
  Text, // Text display element
  StyleSheet, // Style helper
  Pressable, // Button with press feedback
  ScrollView, // Scroll container for the form
  TextInput, // Text field for credentials
  TouchableOpacity, // Tap target for toggles
  ActivityIndicator, // Loading spinner
} from 'react-native';
// Expo Router helpers for navigation.
import { Link, useRouter } from 'expo-router';
// Icon packs used throughout the screen.
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
// Firebase error type for detailed error handling.
import { FirebaseError } from 'firebase/app';
// Firebase authentication helpers for email sign-in.
import {
  signInWithEmailAndPassword, // Email + password sign-in
  sendEmailVerification, // Email verification sender
  sendPasswordResetEmail, // Password reset sender
  signOut, // Sign-out utility
} from 'firebase/auth';
// Firestore helpers for profile documents.
import { doc, runTransaction, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
// Shared Firebase instances for this app.
import { auth, db } from '../lib/firebase';

// Primary login screen component that orchestrates the full authentication experience
export default function LoginScreen() {
  // Router instance used to redirect the user after successful authentication
  const router = useRouter();
  // Controls whether the email/password form is expanded or hidden
  const [showEmailForm, setShowEmailForm] = useState(false);
  // Stores the email address the user is attempting to log in with
  const [email, setEmail] = useState('');
  // Captures the password entry for an email login attempt
  const [password, setPassword] = useState('');
  // Toggles whether the password input should reveal or obscure characters
  const [showPassword, setShowPassword] = useState(false);
  // Tracks whether the primary login action is currently processing
  const [loading, setLoading] = useState(false);
  // Holds any user-facing error surfaced during login attempts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Holds any informative, non-error message to guide the user
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  // Saves the email address awaiting verification so we can resend links
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  // Indicates that the resend verification action is underway
  const [resendLoading, setResendLoading] = useState(false);
  // Indicates that the password-reset email request is executing
  const [resetLoading, setResetLoading] = useState(false);

  // Determines whether the email entry currently satisfies a basic shape check
  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  // Validates that the password meets Firebase's minimum length requirement
  const passwordValid = password.length >= 6; // Firebase requires 6+ chars
  // Establishes whether the login button should be enabled based on form state
  const canSubmit = showEmailForm && emailValid && passwordValid && !loading; // Enable login when form is visible, valid, and idle

  // Toggle handler that expands or collapses the email login form section
  const handleToggleEmailForm = () => {
    // Clear prior errors each time the visibility toggles so the user starts fresh
    setErrorMessage(null);
    // Clear prior info messages to avoid stale prompts when switching modes
    setInfoMessage(null);
    // Flip the boolean controlling the email form
    setShowEmailForm((prev) => !prev);
  };

  // Writes or updates the username + user documents so subsequent sessions stay consistent
  const ensureProfileDocuments = async (uid: string, displayName: string, emailValue: string) => {
    // Normalize the display name for case-insensitive lookups
    const normalized = displayName.toLowerCase();
    // Reference to the usernames document used to reserve this display name
    const usernameRef = doc(db, 'usernames', normalized); // Reference for the normalized display name
    // Perform a direct read to warm caches and catch early conflicts outside the transaction
    const existingUsername = await getDoc(usernameRef); // Prefetch to detect collisions early

    await runTransaction(db, async (transaction) => {
      // Grab the username document within the transaction for atomic safety
      const usernameDoc = await transaction.get(usernameRef);
      // Abort if another user already owns this tag
      if (usernameDoc.exists() && usernameDoc.data()?.uid !== uid) {
        throw new Error('USERNAME_CONFLICT');
      }

      // Upsert the username reservation document for this user
      transaction.set(
        usernameRef,
        {
          uid, // Keep track of the Firebase user's uid on the username record
          displayName, // Preserve the preferred display name for listings
          normalized, // Store the lower-cased variant to support case-insensitive search
          linkedAt: serverTimestamp(), // Timestamp when the linkage was confirmed
        },
        { merge: true },
      );

      // Update the core user profile document with normalized username fields
      transaction.set(
        doc(db, 'users', uid),
        {
          displayName, // Mirror the display name on the core user profile document
          username: displayName, // Maintain compatibility for fields that expect "username"
          normalizedUsername: normalized, // Provide a precomputed match-friendly key
          email: emailValue, // Record the verified email for account recovery workflows
          updatedAt: serverTimestamp(), // Note when the profile was touched
        },
        { merge: true },
      );
    });
  };

  // Handles the core email + password sign-in logic and related edge cases
  const handleEmailLogin = async () => {
    // Guard against accidental submissions when the form is not ready
    if (!canSubmit) return;

    // Normalize the input so authentication becomes case-insensitive
    const emailValue = email.trim().toLowerCase();
    // Indicate the sign-in request is underway
    setLoading(true);
    // Reset stale error banners for a clean start
    setErrorMessage(null);
    // Clear info messages that might no longer apply
    setInfoMessage(null);

    try {
      // Attempt to authenticate with Firebase using the supplied credentials
      const credential = await signInWithEmailAndPassword(auth, emailValue, password);
      const { user } = credential; // Extract the authenticated user for downstream checks

      // Force the user through verification if the email has not been confirmed yet
      if (!user.emailVerified) {
        // Fire off another verification email but ignore failures to avoid blocking
        await sendEmailVerification(user).catch(() => {});
        // Remember the email so the UI can display a resend option
        setPendingVerificationEmail(user.email ?? emailValue);
        // Show a simple instruction so the user knows what to do next
        setInfoMessage('Verify your email to access Playlog. We just sent you a fresh link.');
        // Sign them out immediately to prevent access prior to verification
        await signOut(auth).catch(() => {});
        return;
      }

      // Pull the display name which doubles as the user's public name
      const displayName = user.displayName?.trim();
      if (!displayName) {
        // Escalate if Firebase did not provide the expected display name metadata
        throw new Error(
          'DISPLAY_NAME_MISSING',
        );
      }

      // Ensure Firestore has up-to-date profile records to accompany the Firebase user
      await ensureProfileDocuments(user.uid, displayName, user.email ?? emailValue);

      // Transition the user into the authenticated experience
      router.replace('/(tabs)/home');
    } catch (error) {
      // Default fallback message for unknown sign-in issues
      let message = 'Unable to log you in. Please try again.';

      if (error instanceof FirebaseError) {
        // Handle the set of Firebase auth errors we anticipate from this flow
        switch (error.code) {
          case 'auth/invalid-email': // Input does not resemble an email address
            message = 'That email address does not look right.';
            break;
          case 'auth/user-not-found': // No account exists for this email
          case 'auth/wrong-password': // Password mismatch for the account
            message = 'Email or password is incorrect.';
            break;
          case 'auth/too-many-requests': // Firebase throttled repeated failed attempts
            message = 'Too many attempts. Wait a minute before trying again.';
            break;
          default: // Any other Firebase error falls back to its own message
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error) {
        if (error.message === 'DISPLAY_NAME_MISSING') {
          // We could not fetch the display name metadata for this user
          message =
            'We could not load your display name. Please contact support or sign up again to set one.';
        } else if (error.message === 'USERNAME_CONFLICT') {
          // Another account holds the desired username so manual help is required
          message =
            'Your display name is already linked to another profile. Contact support so we can help restore it.';
        } else {
          // Surface any other generic error content to aid debugging
          message = error.message;
        }
      }

      // Present the resolved error back to the user
      setErrorMessage(message);
      // Sign out to avoid leaving the session in a weird state after partial success
      await signOut(auth).catch(() => {});
    } finally {
      // Re-enable the login button regardless of the outcome
      setLoading(false);
    }
  };

  // Sends another verification email for users who attempted to log in before confirming
  const handleResendVerification = async () => {
    // Avoid running when we do not know which email should receive the verification
    if (!pendingVerificationEmail) return;

    try {
      // Show a spinner on the resend button while we perform the request
      setResendLoading(true);
      // Temporarily sign the user in so Firebase allows us to send a new verification email
      const credential = await signInWithEmailAndPassword(auth, pendingVerificationEmail, password);
      // Dispatch the actual verification email message
      await sendEmailVerification(credential.user);
      // Let the user know that the verification email was sent
      setInfoMessage('Verification email resent. Check your inbox!');
    } catch (error) {
      // Provide a generic failure message since resend issues are rare but possible
      setErrorMessage('Could not resend verification. Try again in a moment.');
    } finally {
      // Sign out to avoid leaving the temporary session active
      await signOut(auth).catch(() => {});
      // Restore the resend button to its idle state
      setResendLoading(false);
    }
  };

  // Triggers a password reset email for the supplied address when requested
  const handlePasswordReset = async () => {
    // Require the user to enter a plausible email before attempting a reset
    if (!emailValid) {
      setErrorMessage('Enter the email linked to your account so we can send a reset link.');
      return;
    }

    // Normalize the email to avoid mismatches due to capitalization
    const emailValue = email.trim().toLowerCase();
    // Remove any previous errors to prevent duplicates
    setErrorMessage(null);
    // Clear info text so we can surface fresh guidance
    setInfoMessage(null);
    // Display a spinner while we communicate with Firebase
    setResetLoading(true);

    try {
      // Ask Firebase Auth to email a password reset link to the user
      await sendPasswordResetEmail(auth, emailValue);
      // Confirm that the request succeeded and prompt the user to check their inbox
      setInfoMessage('Password reset link sent. Check your inbox to continue.');
    } catch (error) {
      // Fallback message that applies to any unknown failure
      let message = 'Unable to send the reset link. Try again later.';
      if (error instanceof FirebaseError) {
        // Map specific Firebase error codes to clearer user-facing descriptions
        switch (error.code) {
          case 'auth/user-not-found': // Email not associated with any account
            message = 'No account exists with that email address.';
            break;
          case 'auth/invalid-email': // Entered address fails Firebase validation
            message = 'That email address does not look right.';
            break;
          default: // Surface Firebase's native message where available
            message = error.message ?? message;
            break;
        }
      }
      // Surface the most helpful message we assembled
      setErrorMessage(message);
    } finally {
      // End the loading state regardless of success or failure
      setResetLoading(false);
    }
  };

  // Render the structured login layout and forms
  return (
    // Outer container establishing spacing and the dark theme backdrop
    <View style={styles.container}>
      {/* Scrollable shell keeps the form usable on small screens and when the keyboard is open */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Link that returns the user to the home tab if they back out of login */}
        <Link href="/(tabs)/home" style={styles.homeLink}>
          {/* Back arrow icon visually reinforces navigation intent */}
          <Ionicons name="arrow-back" size={20} color="#38bdf8" />
          {/* Label for the home navigation affordance */}
          <Text style={styles.homeLinkText}>Home</Text>
        </Link>

        {/* Elevated panel that contains the login intro and form */}
        <View style={styles.panel}>
          {/* Short phrase welcoming returning users */}
          <Text style={styles.kicker}>Welcome back</Text>
          {/* Main headline inviting the user to log in */}
          <Text style={styles.title}>Log in to your dashboard</Text>
          {/* Supporting copy explaining the benefits of signing in */}
          <Text style={styles.subtitle}>
            Track the games you follow, manage reviews, and stay on top of search results.
          </Text>

          {/* Stack of authentication options the user can choose from */}
          <View style={styles.buttonStack}>
            {/* Primary action toggles the email/password form visibility */}
            <Pressable
              style={({ pressed }) => [
                showEmailForm ? styles.primaryButton : styles.secondaryButton,
                showEmailForm && styles.primaryButtonActive,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleToggleEmailForm}
            >
              {/* Icon describing the email login mode */}
              <Ionicons
                name="mail-open"
                size={18}
                color={showEmailForm ? '#0f172a' : '#38bdf8'}
              />
              {/* Dynamic label that reflects whether the form is expanded */}
              <Text
                style={showEmailForm ? styles.primaryButtonText : styles.secondaryButtonText}
              >
                {showEmailForm ? 'Hide email login' : 'Log in with email'}
              </Text>
            </Pressable>
            {/* Placeholder button for the future phone-based login method */}
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Ionicons name="call" size={18} color="#38bdf8" />
              <Text style={styles.secondaryButtonText}>Continue with phone</Text>
            </Pressable>
            {/* Placeholder button for Google sign-in when it becomes available */}
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Ionicons name="logo-google" size={18} color="#38bdf8" />
              <Text style={styles.secondaryButtonText}>Continue with Google</Text>
            </Pressable>
          </View>

          {showEmailForm && (
            /* Card element that frames the email login inputs */
            <View style={styles.formCard}>
              {/* Vertical stack that spaces related form controls */}
              <View style={styles.formGrid}>
                {/* Input cluster for the email value */}
                <View style={styles.inputGroup}>
                  {/* Label row shows the title and optional validation state */}
                  <View style={styles.labelRow}>
                    {/* Static form label for accessibility */}
                    <Text style={styles.label}>Email</Text>
                    {email.length > 0 && (
                      /* Real-time feedback indicating whether the email looks valid */
                      <ValidationStatus
                        passed={emailValid}
                        text={emailValid ? 'Looks valid' : 'Invalid email'}
                      />
                    )}
                  </View>
                  {/* Text field bound to the email state variable */}
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

                {/* Input cluster for the password entry */}
                <View style={styles.inputGroup}>
                  {/* Static label clarifying the field */}
                  <Text style={styles.label}>Password</Text>
                  {/* Row that combines the password field and visibility toggle */}
                  <View style={styles.inputRow}>
                    {/* Controlled password text field with optional masking */}
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor="#475569"
                      secureTextEntry={!showPassword}
                      style={styles.inputField}
                      autoCapitalize="none"
                    />
                    {/* Button that flips the password field between hidden and visible */}
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Primary submit button used to initiate email login */}
                <Pressable
                  style={[styles.primaryButton, styles.submitButton, !canSubmit && styles.submitDisabled]}
                  disabled={!canSubmit}
                  onPress={handleEmailLogin}
                >
                  {loading ? (
                    /* Spinner indicates the login request is active */
                    <ActivityIndicator color={canSubmit ? '#0f172a' : '#475569'} />
                  ) : (
                    <>
                      {/* Icon representing entry into the app */}
                      <Ionicons
                        name="enter-outline"
                        size={18}
                        color={canSubmit ? '#0f172a' : '#475569'}
                      />
                      {/* Button label reinforcing the call to action */}
                      <Text
                        style={[styles.primaryButtonText, !canSubmit && styles.primaryButtonTextDisabled]}
                      >
                        Sign in
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Link-style button that requests a password reset email */}
                <Pressable
                  style={styles.forgotRow}
                  onPress={handlePasswordReset}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    /* Spinner while the reset request is in flight */
                    <ActivityIndicator color="#38bdf8" />
                  ) : (
                    /* Text link inviting users to reset their password */
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  )}
                </Pressable>

                {errorMessage && (
                  /* Banner that communicates actionable errors to the user */
                  <View style={styles.errorBanner}>
                    <Feather name="alert-triangle" size={16} color="#f87171" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {infoMessage && (
                  /* Banner delivering neutral or success info messages */
                  <View style={styles.infoBanner}>
                    <Feather name="info" size={16} color="#38bdf8" />
                    <Text style={styles.infoText}>{infoMessage}</Text>
                  </View>
                )}

                {pendingVerificationEmail && (
                  /* Button to resend a verification email when one is outstanding */
                  <Pressable
                    style={[styles.secondaryButton, styles.resendButton]}
                    onPress={handleResendVerification}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      /* Spinner while we send another verification email */
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
          )}

          {/* Hint reminding users that more sign-in options are coming */}
          <Text style={styles.footerHint}>More sign-in options are on the way.</Text>
          {/* Row linking new users over to the sign-up flow */}
          <View style={styles.altRouteRow}>
            {/* Prompt text for users who do not yet have an account */}
            <Text style={styles.altRouteText}>New to Playlog?</Text>
            {/* Link that navigates to the dedicated sign-up screen */}
            <Link href="/signup" style={styles.altRouteLink}>
              Sign up
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Centralized style definitions for the login screen presentation
const styles = StyleSheet.create({
  // Wrapper that fills the viewport and applies global padding
  container: {
    // Ensure the container grows to the device height
    flex: 1,
    // Add breathing room around the content
    padding: 24,
    // Apply the dark background color
    backgroundColor: '#020617',
  },
  // Scroll view style ensures it expands as needed
  scroll: {
    flex: 1, // Allow the scroll container to fill available space
  },
  // Layout spacing for scroll content
  scrollContent: {
    gap: 24, // Space between sections within the scroll view
  },
  // Styling for the home navigation link wrapper
  homeLink: {
    flexDirection: 'row', // Place icon and text side by side
    alignItems: 'center', // Vertically center the link contents
    gap: 6, // Provide breathing room between icon and text
    alignSelf: 'flex-start', // Keep the link aligned to the screen edge
  },
  // Text appearance for the home link label
  homeLinkText: {
    color: '#38bdf8', // Cyan color matching the navigation icon
    fontSize: 16, // Medium type size for readability
    fontWeight: '600', // Semi-bold weight to emphasize the link
  },
  // Elevated panel styling for the main card
  panel: {
    borderRadius: 24, // Round the corners of the main card
    padding: 32, // Provide internal spacing for content
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Semi-transparent deep navy background
    borderWidth: 1, // Outline the card with a subtle border
    borderColor: 'rgba(8, 145, 178, 0.3)', // Light aqua border
    justifyContent: 'flex-start', // Align child content from the top
    gap: 24, // Separate stacked sections within the card
    shadowColor: '#0ea5e9', // Cyan shadow color
    shadowOpacity: 0.35, // Medium shadow strength
    shadowRadius: 24, // Blur radius for the shadow
    shadowOffset: {
      width: 0, // Keep the shadow centered horizontally
      height: 12, // Push the shadow straight downward
    },
  },
  // Kicker copy styling
  kicker: {
    color: '#38bdf8', // Cyan accent color
    fontSize: 14, // Compact uppercase size
    letterSpacing: 1.6, // Slightly spaced letters
    textTransform: 'uppercase', // Present copy in all caps
  },
  // Main headline styling
  title: {
    fontSize: 28, // Large heading size
    fontWeight: '800', // Extra bold weight
    color: '#f8fafc', // High-contrast white text
  },
  // Supporting subtitle styling
  subtitle: {
    fontSize: 16, // Comfortable reading size
    color: '#cbd5f5', // Muted blue tint
    lineHeight: 22, // Extra line spacing for readability
  },
  // Column of authentication options
  buttonStack: {
    gap: 16, // Space between the stacked buttons
  },
  // Primary call-to-action button styling
  primaryButton: {
    height: 52, // Uniform button height across platforms
    borderRadius: 16, // Rounded corners
    backgroundColor: '#38bdf8', // Bright cyan primary color
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Center content vertically
    justifyContent: 'center', // Center content horizontally
    gap: 12, // Space between icon and label
  },
  // Typography for the primary button label
  primaryButtonText: {
    fontSize: 16, // Standard button text size
    fontWeight: '700', // Bold weight for emphasis
    color: '#0f172a', // Dark navy text for contrast on cyan
  },
  // Additional styling when the primary button is the active selection
  primaryButtonActive: {
    shadowColor: '#38bdf8', // Cyan shadow color
    shadowOpacity: 0.5, // Noticeable but soft shadow strength
    shadowRadius: 18, // Diffuse shadow edges
    shadowOffset: {
      width: 0, // Keep the shadow centered left-to-right
      height: 10, // Offset the shadow vertically downward
    },
    backgroundColor: '#38bdf8', // Maintain the cyan fill
  },
  // Secondary action button styling
  secondaryButton: {
    height: 52, // Align button heights across the stack
    borderRadius: 16, // Match the rounded aesthetic
    borderWidth: 1, // Outline to differentiate from primary button
    borderColor: 'rgba(14, 165, 233, 0.4)', // Translucent teal border
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Semi-transparent panel color
    flexDirection: 'row', // Horizontal layout for icon + text
    alignItems: 'center', // Vertically center contents
    justifyContent: 'center', // Center contents horizontally
    gap: 12, // Space between icon and label
  },
  // Text style for secondary buttons
  secondaryButtonText: {
    fontSize: 16, // Same size as primary label
    fontWeight: '600', // Semi-bold weight for clarity
    color: '#e0f2fe', // Light text color for contrast
  },
  // Visual feedback when buttons are pressed
  buttonPressed: {
    opacity: 0.75, // Slightly dim the button during press interactions
  },
  // Styling for the footer hint text
  footerHint: {
    color: '#64748b', // Muted blue-gray tone
    fontSize: 13, // Small print size for auxiliary hint
    textAlign: 'center', // Center align beneath the form
  },
  // Layout for the alternative route row at the bottom
  altRouteRow: {
    marginTop: -8, // Slightly tuck the row under the hint copy
    flexDirection: 'row', // Lay out prompt and link side by side
    justifyContent: 'center', // Center the row horizontally
    alignItems: 'center', // Vertically align text baseline
    gap: 6, // Provide spacing between prompt and link
  },
  // Typography for the supporting text in the alt route section
  altRouteText: {
    color: '#94a3b8', // Muted blue tone to stay secondary
    fontSize: 14, // Standard body text size
  },
  // Styling for the sign-up link in the alt route section
  altRouteLink: {
    color: '#38bdf8', // Cyan link color for affordance
    fontSize: 14, // Match the surrounding text size
    fontWeight: '600', // Semi-bold to highlight interactiveness
  },
  // Card wrapper for email form elements
  formCard: {
    borderRadius: 20, // Round the card edges generously
    padding: 20, // Provide internal spacing around form controls
    backgroundColor: 'rgba(2, 6, 23, 0.6)', // Translucent deep navy background
    borderWidth: 1, // Subtle outline for separation
    borderColor: 'rgba(8, 145, 178, 0.3)', // Aqua border accent
    gap: 20, // Space form sections apart
  },
  // Grid controlling vertical spacing of form elements
  formGrid: {
    gap: 18, // Consistent vertical rhythm within the form
  },
  // Wrapper around each form group
  inputGroup: {
    gap: 8, // Tight spacing between labels and inputs
  },
  // Label typography shared by inputs
  label: {
    color: '#e2e8f0', // Light text for readability on dark background
    fontSize: 14, // Standard form label size
    fontWeight: '600', // Semi-bold for emphasis
  },
  // Row aligning labels with validation state
  labelRow: {
    flexDirection: 'row', // Place label and status horizontally
    justifyContent: 'space-between', // Separate them to opposite edges
    alignItems: 'center', // Align vertically for clean baseline
  },
  // Styling for standalone text inputs
  input: {
    height: 50, // Consistent input height for touch targets
    borderRadius: 14, // Rounded corners matching the card aesthetic
    paddingHorizontal: 16, // Internal horizontal padding for text comfort
    backgroundColor: 'rgba(30, 41, 59, 0.9)', // Translucent slate background
    borderWidth: 1, // Subtle border for focus ring alt
    borderColor: 'rgba(148, 163, 184, 0.25)', // Soft border color for contrast
    color: '#f1f5f9', // Light text color for readability
  },
  // Container for inputs that include an accessory control
  inputRow: {
    flexDirection: 'row', // Place field and toggle horizontally
    alignItems: 'center', // Align the eye icon vertically with the text
    borderRadius: 14, // Match rounding with standalone inputs
    borderWidth: 1, // Outline to mirror the standard field
    borderColor: 'rgba(148, 163, 184, 0.25)', // Soft border for the control group
    backgroundColor: 'rgba(30, 41, 59, 0.9)', // Same background as single fields
    paddingHorizontal: 12, // Slightly narrower internal padding to accommodate icon
  },
  // Text input field styling when nested inside inputRow
  inputField: {
    flex: 1, // Allow the field to occupy available space
    height: 50, // Match the standalone input height
    color: '#f1f5f9', // Light text color for dark background
  },
  // Margin above the submit button to separate it from inputs
  submitButton: {
    marginTop: 8, // Provide breathing room before the button
  },
  // Disabled state styling for the submit button
  submitDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)', // Dim the button when disabled
  },
  // Typography adjustments when the primary button is disabled
  primaryButtonTextDisabled: {
    color: '#475569', // Muted label color when action unavailable
  },
  // Container styling for error messages
  errorBanner: {
    marginTop: 12, // Space the banner from elements above it
    flexDirection: 'row', // Align icon and text on one row
    alignItems: 'center', // Center icon and text vertically
    gap: 8, // Space between icon and text
    padding: 12, // Internal padding for readability
    borderRadius: 12, // Rounded corners to match UI language
    backgroundColor: 'rgba(248, 113, 113, 0.12)', // Light red background to signal error
    borderWidth: 1, // Outline for emphasis
    borderColor: 'rgba(248, 113, 113, 0.35)', // Red-tinted border color
  },
  // Text styling within error banners
  errorText: {
    color: '#fecaca', // Soft red text color for contrast
    flex: 1, // Allow text to wrap within available width
    fontSize: 13, // Compact size matching status messages
  },
  // Container styling for informational messages
  infoBanner: {
    marginTop: 12, // Space from previous elements
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Center items vertically
    gap: 8, // Space icon from text
    padding: 12, // Padding for comfortable reading
    borderRadius: 12, // Rounded corners consistent with other banners
    backgroundColor: 'rgba(14, 165, 233, 0.12)', // Light blue background for info tone
    borderWidth: 1, // Outline to make the banner distinct
    borderColor: 'rgba(14, 165, 233, 0.35)', // Blue-tinted border for emphasis
  },
  // Text styling for info banner copy
  infoText: {
    color: '#bae6fd', // Soft blue text color
    flex: 1, // Allow text to occupy remaining width
    fontSize: 13, // Compact informational text size
  },
  // Styling tweaks for the resend verification button
  resendButton: {
    borderColor: 'rgba(59, 130, 246, 0.35)', // Brighter border to highlight the action
  },
  // Layout for the forgot password pressable area
  forgotRow: {
    marginTop: 12, // Space above the reset link
    alignSelf: 'flex-start', // Align the link to the left edge of the form
  },
  // Styling for the forgot password label
  forgotText: {
    color: '#38bdf8', // Cyan highlight to indicate interactivity
    fontSize: 14, // Body-sized link text
    fontWeight: '600', // Semi-bold for emphasis
    textDecorationLine: 'underline', // Underline to reinforce link affordance
  },
  // Horizontal alignment for validation indicators
  validationRow: {
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Vertically center elements
    gap: 8, // Separate the icon from the message
  },
  // Base styling for validation text cues
  validationText: {
    color: '#64748b', // Slate color for neutral status
    fontSize: 13, // Compact status text size
  },
  // Styling when a validation passes successfully
  validationTextPassed: {
    color: '#22c55e', // Green text indicating success
  },
});

// Props describing whether a validation item passed and the label to show
type ValidationStatusProps = { passed: boolean; text: string };

// Shared component that displays an icon + text to represent validation rules
function ValidationStatus({ passed, text }: ValidationStatusProps) {
  return (
    <View style={styles.validationRow}>
      {/* Icon switches between an outlined and filled circle based on pass state */}
      <Feather
        name={passed ? 'check-circle' : 'circle'}
        size={16}
        color={passed ? '#22c55e' : '#475569'}
      />
      {/* Descriptive text explaining the validation rule status */}
      <Text style={[styles.validationText, passed && styles.validationTextPassed]}>{text}</Text>
    </View>
  );
}
