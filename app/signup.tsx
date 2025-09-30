// React hooks that power local component state and derived memoized values
import { useMemo, useState } from 'react';
// Core React Native primitives used to render the signup experience
import {
  View, // Layout container for each section of the screen
  Text, // Textual content for headings and helper copy
  StyleSheet, // Utility to define static style maps
  Pressable, // Interactive surfaces for buttons and toggles
  ScrollView, // Scroll container to keep content reachable on smaller displays
  TextInput, // Native text field used for credentials and profile info
  TouchableOpacity, // Tappable control for show/hide password toggles
  ActivityIndicator, // Loading spinner used during asynchronous actions
} from 'react-native';
// Routing utility so we can deep link to other screens from within the form
import { Link } from 'expo-router';
// Icon libraries to provide consistent visuals throughout the screen
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
// Firebase error class for tailoring error messages to specific failure codes
import { FirebaseError } from 'firebase/app';
// Firebase auth helpers used to register new users and manage their session
import {
  createUserWithEmailAndPassword, // Creates a Firebase user with email + password
  sendEmailVerification, // Dispatches a verification email to the new account
  updateProfile, // Allows us to set the display name immediately after signup
  signOut, // Signs the user out after registration to await verification
} from 'firebase/auth';
// Firestore utilities for checking uniqueness and reserving usernames
import { doc, getDoc } from 'firebase/firestore';
// Shared Firebase instances that connect this screen to our backend services
import { auth, db } from '../lib/firebase';

// Main signup screen component that controls account creation flows
export default function SignupScreen() {
  // Controls whether the email registration form is currently visible
  const [showEmailForm, setShowEmailForm] = useState(false);
  // Captures the user's chosen display name
  const [fullName, setFullName] = useState('');
  // Stores the email address being used for signup
  const [email, setEmail] = useState('');
  // Holds the password the user is creating
  const [password, setPassword] = useState('');
  // Captures the confirmation password to guard against typos
  const [confirmPassword, setConfirmPassword] = useState('');
  // Tracks whether the user accepted the terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Toggles password visibility for the main password field
  const [showPassword, setShowPassword] = useState(false);
  // Toggles visibility for the confirmation password field
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Indicates that the signup request or verification flow is in progress
  const [loading, setLoading] = useState(false);
  // Stores any surfaced errors during signup attempts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Marks whether we have already dispatched a verification email
  const [verificationSent, setVerificationSent] = useState(false);
  // Remembers which email the verification message was sent to
  const [sentEmail, setSentEmail] = useState('');
  // Provides extra context if sending the verification email fails
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Simple regex check to confirm the email looks like an address
  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  // Derive the status of each password requirement from the current password
  const passwordChecks = useMemo(() => {
    const checks = {
      length: password.length >= 8, // Enforce minimum character length
      upper: /[A-Z]/.test(password), // Require at least one uppercase letter
      lower: /[a-z]/.test(password), // Require at least one lowercase letter
      number: /\d/.test(password), // Require at least one numeric digit
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password), // Require at least one special character
    };
    return checks;
  }, [password]);
  // Collapse the individual password checks into a single boolean for convenience
  const allPasswordChecksPass = useMemo(
    () => Object.values(passwordChecks).every(Boolean),
    [passwordChecks],
  );
  // Confirm the password and confirmation fields match exactly
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  // Compute whether all signup criteria have been satisfied
  const canSubmit =
    !verificationSent && // Do not resubmit once the verification email has been sent
    showEmailForm && // Ensure the email form is visible
    fullName.trim().length > 1 && // Require a short display name
    emailValid && // Require the email format to look correct
    allPasswordChecksPass && // Enforce all password strength rules
    passwordsMatch && // Ensure the password confirmation matches
    termsAccepted; // Require the user to accept terms and conditions
  // Secondary guard that also checks the loading state before enabling the button
  const allowSubmit = canSubmit && !loading; // Disable while a request is running

  // Toggle function that expands or hides the email signup form
  const handleToggleEmailForm = () => {
    // Reset prior error messaging when switching visibility
    setErrorMessage(null);
    // Clear lingering verification warnings for a fresh start
    setVerificationError(null);
    // Flip the visibility flag for the form
    setShowEmailForm((prev) => !prev);
  };

  // Performs the email-based account creation workflow and handles related states
  const handleEmailSignup = async () => {
    // Prevent submission when any prerequisite condition is unmet
    if (!allowSubmit) return;

    // Prepare normalized values up front for consistent writes and comparisons
    const displayName = fullName.trim();
    const normalizedUsername = displayName.toLowerCase();
    const emailValue = email.trim().toLowerCase();
    const usernameRef = doc(db, 'usernames', normalizedUsername); // Firestore doc used to reserve the display name

    // Enter the loading state and clear residual messaging
    setLoading(true);
    setErrorMessage(null);
    setVerificationError(null);

    // Track whether we successfully created the Firebase user to decide on cleanup later
    let userCreated = false;

    try {
      // Ensure the requested display name has not already been claimed
      const usernameSnapshot = await getDoc(usernameRef); // Check if the desired username already exists
      if (usernameSnapshot.exists()) {
        throw new Error('USERNAME_TAKEN');
      }

      // Create the Firebase Auth user account with the supplied email and password
      const credential = await createUserWithEmailAndPassword(auth, emailValue, password);
      const { user } = credential; // Grab the Firebase user object for configuration
      userCreated = true;

      // Immediately set the user's display name so subsequent logins can rely on it
      await updateProfile(user, { displayName });

      try {
        // Attempt to send the verification email right after account creation
        await sendEmailVerification(user);
      } catch (error) {
        // Provide guidance if the verification email fails even though the account exists
        setVerificationError(
          'Account created, but we could not send the verification email. You can request a new link from the login screen.',
        );
      }

      // Sign them out so they can verify before accessing the dashboard
      await signOut(auth).catch(() => {});

      // Remember which email we contacted and update the UI to the success state
      setSentEmail(user.email ?? emailValue); // Track where the verification email was sent
      setVerificationSent(true); // Switch the UI into the verification success state
      setFullName(''); // Reset the display name field for the next visit
      setEmail(''); // Clear the email input
      setPassword(''); // Remove the password value from state
      setConfirmPassword(''); // Clear the confirmation field as well
      setTermsAccepted(false); // Reset the terms checkbox to unchecked
      setShowEmailForm(false); // Collapse the email form after successful submission
    } catch (error) {
      // Default message for unexpected signup issues
      let message = 'Unable to create your account. Please try again.';

      if (error instanceof FirebaseError) {
        // Translate Firebase auth errors into friendly messages
        switch (error.code) {
          case 'auth/email-already-in-use': // Email already registered with another account
            message = 'That email is already linked to another Playlog account.';
            break;
          case 'auth/invalid-email': // Address fails Firebase validation rules
            message = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password': // Password does not meet Firebase minimum strength
            message = 'Your password needs to meet every requirement before we can continue.';
            break;
          case 'auth/operation-not-allowed': // Email signup is disabled in Firebase console
            message = 'Email sign up is currently disabled. Please try again later.';
            break;
          case 'auth/too-many-requests': // Firebase rate-limited the signup attempts
            message = 'Too many attempts. Wait a bit before trying again.';
            break;
          default: // Provide Firebase's own message when available
            message = error.message ?? message;
            break;
        }
      } else if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        // Display name record already belongs to someone else
        message = 'That display name is already in use. Please choose another one.';
      }

      // Surface the assembled error message in the UI
      setErrorMessage(message);

      if (userCreated) {
        // Ensure we sign the new user out if the flow failed after creation
        await signOut(auth).catch(() => {});
      }
    } finally {
      // Release the loading indicator regardless of outcome
      setLoading(false);
    }
  };

  // Render the full signup experience including marketing and form sections
  return (
    // Outer container applying padding and background
    <View style={styles.container}>
      {/* Scroll wrapper that keeps the form accessible with the keyboard open */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Link allowing users to navigate back to the home tab */}
        <Link href="/(tabs)/home" style={styles.homeLink}>
          {/* Back arrow icon supporting the navigation affordance */}
          <Ionicons name="arrow-back" size={20} color="#8b5cf6" />
          {/* Text label for the home link */}
          <Text style={styles.homeLinkText}>Home</Text>
        </Link>

        {/* Main panel that houses marketing copy and the signup form */}
        <View style={styles.panel}>
          {/* Kicker text that sets the tone for the page */}
          <Text style={styles.kicker}>Discover new games</Text>
          {/* Primary headline inviting account creation */}
          <Text style={styles.title}>Create your Playlog account</Text>
          {/* Supporting description of the benefits */}
          <Text style={styles.subtitle}>
            Save the games you care about, write reviews, and keep your search history handy.
          </Text>

          {verificationSent ? (
            /* Success card displayed after the verification email has been dispatched */
            <View style={styles.successCard}>
              {/* Icon reinforcing successful account creation */}
              <Feather name="check-circle" size={28} color="#34d399" />
              {/* Title reassuring the user that only verification remains */}
              <Text style={styles.successTitle}>Almost there</Text>
              {/* Body copy explaining the next step */}
              <Text style={styles.successCopy}>
                We just sent a verification link to {sentEmail}. Confirm your email to access your
                dashboard.
              </Text>
              {verificationError && (
                /* Warning text shown only if the verification email failed */
                <Text style={styles.successWarning}>{verificationError}</Text>
              )}
              {/* Row of follow-up navigation links */}
              <View style={styles.successActions}>
                <Link href="/login" style={styles.successPrimaryAction}>
                  Go to login
                </Link>
                <Link href="/(tabs)/home" style={styles.successSecondaryAction}>
                  Back to home
                </Link>
              </View>
            </View>
          ) : (
            <>
              {/* Stack of sign-up method buttons */}
              <View style={styles.buttonStack}>
                {/* Button that reveals or hides the email form */}
                <Pressable
                  style={({ pressed }) => [
                    showEmailForm ? styles.primaryButton : styles.secondaryButton,
                    showEmailForm && styles.primaryButtonActive,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleToggleEmailForm}
                >
                  <Ionicons
                    name="mail"
                    size={18}
                    color={showEmailForm ? '#0f172a' : '#8b5cf6'}
                  />
                  <Text
                    style={showEmailForm ? styles.primaryButtonText : styles.secondaryButtonText}
                  >
                    {showEmailForm ? 'Hide email sign up' : 'Continue with email'}
                  </Text>
                </Pressable>
                {/* Placeholder button for future phone signup support */}
                <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Ionicons name="call" size={18} color="#8b5cf6" />
                  <Text style={styles.secondaryButtonText}>Continue with phone</Text>
                </Pressable>
                {/* Placeholder button for eventual Google signup */}
                <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Ionicons name="logo-google" size={18} color="#8b5cf6" />
                  <Text style={styles.secondaryButtonText}>Continue with Google</Text>
                </Pressable>
              </View>

              {showEmailForm && (
                /* Card containing the email signup form fields */
                <View style={styles.formCard}>
                  {/* Column that spaces form sections evenly */}
                  <View style={styles.formGrid}>
                    {/* Display name input group */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Full name</Text>
                      <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Choose your display name"
                        placeholderTextColor="#475569"
                        style={styles.input}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Email address input group with validation feedback */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Email</Text>
                        {email.length > 0 && (
                          <ValidationStatus
                            passed={emailValid}
                            text={emailValid ? 'Looks valid' : 'Invalid email'}
                          />
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

                    {/* Password entry field */}
                    <PasswordField
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggleShow={() => setShowPassword((prev) => !prev)}
                    />

                    {/* Password confirmation field */}
                    <PasswordField
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirmPassword}
                      onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
                    />

                    {/* Checklist outlining the password requirements */}
                    <View style={styles.validationPanel}>
                      <Text style={styles.validationTitle}>Password requirements</Text>
                      <ValidationStatus passed={passwordChecks.length} text="At least 8 characters" />
                      <ValidationStatus passed={passwordChecks.upper} text="One uppercase letter" />
                      <ValidationStatus passed={passwordChecks.lower} text="One lowercase letter" />
                      <ValidationStatus passed={passwordChecks.number} text="One number" />
                      <ValidationStatus
                        passed={passwordChecks.special}
                        text="One special symbol"
                      />
                      <ValidationStatus passed={passwordsMatch} text="Passwords match" />
                    </View>

                    {/* Checkbox for the required terms acknowledgement */}
                    <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((prev) => !prev)}>
                      <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                        {termsAccepted && <Feather name="check" size={16} color="#0f172a" />}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        I agree to the Playlog <Text style={styles.linkText}>terms & conditions</Text>
                      </Text>
                    </Pressable>

                    {/* Submit button for creating the account */}
                    <Pressable
                      style={[styles.primaryButton, styles.submitButton, !allowSubmit && styles.submitDisabled]}
                      disabled={!allowSubmit}
                      onPress={handleEmailSignup}
                    >
                      {loading ? (
                        /* Spinner indicating the signup request is running */
                        <ActivityIndicator color={allowSubmit ? '#0f172a' : '#475569'} />
                      ) : (
                        <>
                          <Ionicons
                            name="shield-checkmark"
                            size={18}
                            color={allowSubmit ? '#0f172a' : '#475569'}
                          />
                          <Text
                            style={[
                              styles.primaryButtonText,
                              !allowSubmit && styles.primaryButtonTextDisabled,
                            ]}
                          >
                            Create account
                          </Text>
                        </>
                      )}
                    </Pressable>

                    {errorMessage && (
                      /* Error banner shown when signup fails */
                      <View style={styles.errorBanner}>
                        <Feather name="alert-triangle" size={16} color="#f87171" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Teaser letting users know more auth options are coming */}
              <Text style={styles.footerHint}>More ways to sign up are coming soon.</Text>
              {/* Alternate navigation for users who already registered */}
              <View style={styles.altRouteRow}>
                <Text style={styles.altRouteText}>Already have a profile?</Text>
                <Link href="/login" style={styles.altRouteLink}>
                  Log in
                </Link>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Styles dedicated to the signup screen visual design
const styles = StyleSheet.create({
  // Root container filling the available space with padding
  container: {
    flex: 1, // Expand to fill screen height
    padding: 24, // Apply consistent outer padding
    backgroundColor: '#020617', // Deep space background color
  },
  // Scroll view styling to allow full-height scrolling
  scroll: {
    flex: 1, // Let the scroll view fill remaining space
  },
  // Spacing configuration for scroll content
  scrollContent: {
    gap: 24, // Vertical spacing between major sections
  },
  // Wrapper styling for the home navigation link
  homeLink: {
    flexDirection: 'row', // Lay out icon and text horizontally
    alignItems: 'center', // Vertically align the link contents
    gap: 6, // Space icon away from text
    alignSelf: 'flex-start', // Keep link to the left edge
  },
  // Appearance of the home link text
  homeLinkText: {
    color: '#8b5cf6', // Lavender accent color
    fontSize: 16, // Medium text size for visibility
    fontWeight: '600', // Semi-bold weight for emphasis
  },
  // Panel styling for the main signup card
  panel: {
    borderRadius: 24, // Rounded edges for the hero card
    padding: 32, // Generous internal padding for layout
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Translucent dark navy background
    borderWidth: 1, // Outline to delineate card from background
    borderColor: 'rgba(139, 92, 246, 0.3)', // Violet-tinted border
    justifyContent: 'flex-start', // Stack contents from the top
    gap: 24, // Space between card sections
    shadowColor: '#8b5cf6', // Lavender shadow color
    shadowOpacity: 0.35, // Medium shadow strength
    shadowRadius: 24, // Blurred edges on the shadow
    shadowOffset: {
      width: 0, // Keep the shadow centered horizontally
      height: 12, // Drop the shadow vertically downward
    },
  },
  // Styling for the kicker tagline
  kicker: {
    color: '#38bdf8', // Cyan accent color tying to brand palette
    fontSize: 14, // Compact type size for the intro line
    letterSpacing: 1.6, // Add breathing room between letters
    textTransform: 'uppercase', // Display the phrase in all caps
  },
  // Typography for the main title
  title: {
    fontSize: 28, // Large heading size for prominence
    fontWeight: '800', // Heavy weight to anchor the page
    color: '#f8fafc', // High contrast white text
  },
  // Supporting subtitle text styling
  subtitle: {
    fontSize: 16, // Comfortable reading size
    color: '#cbd5f5', // Muted lavender-blue
    lineHeight: 22, // Extra leading to improve readability
  },
  // Vertical spacing for the alternative sign-up buttons
  buttonStack: {
    gap: 16, // Even spacing between the stacked buttons
  },
  // Primary button styling used for the email option
  primaryButton: {
    height: 52, // Standard button height for touch comfort
    borderRadius: 16, // Rounded edges consistent with brand style
    backgroundColor: '#c4b5fd', // Lavender button color
    flexDirection: 'row', // Align icon and label horizontally
    alignItems: 'center', // Center contents vertically
    justifyContent: 'center', // Center contents horizontally
    gap: 12, // Space between icon and text
  },
  // Typography for primary button text
  primaryButtonText: {
    fontSize: 16, // Standard CTA text size
    fontWeight: '700', // Bold to draw attention
    color: '#0f172a', // Deep slate text for contrast on lavender
  },
  // Highlight style when the primary button is active
  primaryButtonActive: {
    shadowColor: '#c4b5fd', // Lavender shadow color
    shadowOpacity: 0.5, // Noticeable but soft shadow strength
    shadowRadius: 18, // Diffuse the shadow edges
    shadowOffset: {
      width: 0, // Keep the shadow centered horizontally
      height: 10, // Drop the shadow downward evenly
    },
    backgroundColor: '#c4b5fd', // Keep fill consistent when active
  },
  // Styling for secondary buttons such as phone or Google options
  secondaryButton: {
    height: 52, // Match the primary button height
    borderRadius: 16, // Maintain the rounded motif
    borderWidth: 1, // Outline to differentiate from primary button
    borderColor: 'rgba(139, 92, 246, 0.4)', // Semi-transparent violet border
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Translucent dark fill
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Vertically center the button contents
    justifyContent: 'center', // Center horizontally as well
    gap: 12, // Space between icon and label
  },
  // Text styling for secondary buttons
  secondaryButtonText: {
    fontSize: 16, // Keep text size consistent with primary button
    fontWeight: '600', // Semi-bold for readability
    color: '#e0e7ff', // Pale lavender text color on dark background
  },
  // Reduced opacity while a button is pressed
  buttonPressed: {
    opacity: 0.75, // Visual feedback during button press
  },
  // Style for the footer hint message
  footerHint: {
    color: '#64748b', // Muted blue-gray tone
    fontSize: 13, // Small supportive copy size
    textAlign: 'center', // Center align beneath form
  },
  // Layout for the alternate navigation row at the bottom
  altRouteRow: {
    marginTop: -8, // Pull the row closer to the hint copy
    flexDirection: 'row', // Lay out prompt and link side by side
    justifyContent: 'center', // Center align the row content
    alignItems: 'center', // Align baselines for prompt and link
    gap: 6, // Space between prompt and action link
  },
  // Typography for the alternate route prompt text
  altRouteText: {
    color: '#94a3b8', // Muted tone to keep focus on the link
    fontSize: 14, // Standard body text size
  },
  // Styling for the login link in the alternate route row
  altRouteLink: {
    color: '#c4b5fd', // Lavender hue matching the primary button
    fontSize: 14, // Align with prompt text size
    fontWeight: '600', // Semi-bold to signal interactivity
  },
  // Card styling around the email signup form
  formCard: {
    borderRadius: 20, // Soft rounded card for the form inputs
    padding: 20, // Internal spacing around form content
    backgroundColor: 'rgba(2, 6, 23, 0.6)', // Dark translucent background
    borderWidth: 1, // Outline to separate from panel
    borderColor: 'rgba(139, 92, 246, 0.2)', // Violet border accent
    gap: 20, // Space out groups within the form
  },
  // Vertical stack configuration for form controls
  formGrid: {
    gap: 18, // Consistent spacing between input sections
  },
  // Wrapper applied to individual form groups
  inputGroup: {
    gap: 8, // Space between label and input
  },
  // Shared label styling for inputs
  label: {
    color: '#e2e8f0', // Light label text for dark background
    fontSize: 14, // Standard form label size
    fontWeight: '600', // Semi-bold weight to improve legibility
  },
  // Row aligning labels with inline validation elements
  labelRow: {
    flexDirection: 'row', // Position label and status horizontally
    justifyContent: 'space-between', // Push elements to edges
    alignItems: 'center', // Align vertically for symmetry
  },
  // Base styling for standalone text inputs
  input: {
    height: 50, // Satisfy touch target guidance
    borderRadius: 14, // Rounded edges consistent with other UI elements
    paddingHorizontal: 16, // Comfortable internal spacing for text
    backgroundColor: 'rgba(30, 41, 59, 0.9)', // Translucent slate input background
    borderWidth: 1, // Provide a subtle outline
    borderColor: 'rgba(148, 163, 184, 0.25)', // Soft neutral border tone
    color: '#f1f5f9', // Light text for readability
  },
  // Layout styling for inputs with accessory controls
  inputRow: {
    flexDirection: 'row', // Align field and toggle horizontally
    alignItems: 'center', // Center icon and text vertically
    borderRadius: 14, // Match the shape of standalone inputs
    borderWidth: 1, // Outline to mirror the single input style
    borderColor: 'rgba(148, 163, 184, 0.25)', // Subtle border tone
    backgroundColor: 'rgba(30, 41, 59, 0.9)', // Dark translucent field background
    paddingHorizontal: 12, // Slightly reduced padding to fit icon
  },
  // Text input styling when nested in an inputRow
  inputField: {
    flex: 1, // Allow the text field to expand
    height: 50, // Align height with other inputs
    color: '#f1f5f9', // Light text for readability
  },
  // Panel styling for the password requirement checklist
  validationPanel: {
    borderRadius: 16, // Rounded panel corners
    padding: 16, // Internal padding for readability
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Semi-transparent dark backing
    borderWidth: 1, // Outline to separate from background
    borderColor: 'rgba(139, 92, 246, 0.2)', // Violet border to tie with theme
    gap: 8, // Space between validation rows
  },
  // Header styling above the validation items
  validationTitle: {
    color: '#94a3b8', // Muted header color
    fontSize: 13, // Smaller heading size for checklist
    fontWeight: '600', // Semi-bold to differentiate from items
    letterSpacing: 1, // Slight tracking for stylized caption
  },
  // Alignment of validation rows
  validationRow: {
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Center them vertically
    gap: 8, // Space between icon and message
  },
  // Base typography for validation text
  validationText: {
    color: '#64748b', // Neutral slate tone
    fontSize: 13, // Compact label size for checklist
  },
  // Additional styling that highlights passing validation items
  validationTextPassed: {
    color: '#22c55e', // Green text when requirement passes
  },
  // Layout for the terms checkbox row
  checkboxRow: {
    flexDirection: 'row', // Align checkbox and text horizontally
    alignItems: 'center', // Align them vertically
    gap: 12, // Space between checkbox and label
  },
  // Base styling for the checkbox outline
  checkbox: {
    width: 22, // Square dimension sized for touch
    height: 22, // Same height as width for a square
    borderRadius: 6, // Light rounding on corners
    borderWidth: 1, // Outline to denote control
    borderColor: 'rgba(148, 163, 184, 0.6)', // Muted border color
    alignItems: 'center', // Center the check icon horizontally
    justifyContent: 'center', // Center the icon vertically
    backgroundColor: 'transparent', // Transparent fill until selected
  },
  // Styling applied when the checkbox is selected
  checkboxChecked: {
    backgroundColor: '#c4b5fd', // Lavender fill when checked
    borderColor: '#c4b5fd', // Match border to the fill color
  },
  // Typography for the checkbox label
  checkboxLabel: {
    color: '#cbd5f5', // Light text for readability
    flex: 1, // Allow the label to wrap naturally
  },
  // Inline link styling used within the terms text
  linkText: {
    color: '#38bdf8', // Cyan link color for emphasis
    textDecorationLine: 'underline', // Underline to denote link
  },
  // Margin to separate the submit button from the preceding content
  submitButton: {
    marginTop: 8, // Add space before the submit action
  },
  // Visual treatment when the submit button is disabled
  submitDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)', // Dim the button when inactive
  },
  // Typography adjustments for a disabled primary button
  primaryButtonTextDisabled: {
    color: '#475569', // Subdue the label color when disabled
  },
  // Styling for generic error banners within the form
  errorBanner: {
    marginTop: 12, // Space the banner from preceding form elements
    flexDirection: 'row', // Align icon and text in a row
    alignItems: 'center', // Vertically center the contents
    gap: 8, // Space between icon and message
    padding: 12, // Internal padding for readability
    borderRadius: 12, // Rounded corners consistent with rest of UI
    backgroundColor: 'rgba(248, 113, 113, 0.12)', // Light red background to signal error
    borderWidth: 1, // Outline to emphasize the banner
    borderColor: 'rgba(248, 113, 113, 0.35)', // Red border accent for clarity
  },
  // Error text styling inside the error banner
  errorText: {
    color: '#fecaca', // Soft red text color for contrast
    flex: 1, // Allow text to wrap across available width
    fontSize: 13, // Compact status text size
  },
  // Success card styling shown after signup
  successCard: {
    marginTop: 8, // Space the success state from the preceding copy
    borderRadius: 20, // Rounded card corners
    padding: 24, // Internal padding for comfortable reading
    gap: 12, // Space between the success elements
    backgroundColor: 'rgba(15, 23, 42, 0.7)', // Translucent dark background for the card
    borderWidth: 1, // Outline to highlight the success state
    borderColor: 'rgba(34, 197, 94, 0.25)', // Green-tinted border to suggest success
  },
  // Title styling used in the success card
  successTitle: {
    color: '#f8fafc', // Bright white text for the heading
    fontSize: 22, // Large headline size
    fontWeight: '700', // Bold to reinforce success
  },
  // Supporting copy styling inside the success card
  successCopy: {
    color: '#cbd5f5', // Soft lavender text for body content
    fontSize: 15, // Comfortable reading size
    lineHeight: 22, // Additional line spacing for readability
  },
  // Style for the optional warning in the success state
  successWarning: {
    color: '#facc15', // Golden text color to indicate caution
    fontSize: 13, // Small supporting text size
    lineHeight: 18, // Slight extra spacing for legibility
  },
  // Layout for the action links inside the success card
  successActions: {
    flexDirection: 'row', // Align action links horizontally
    flexWrap: 'wrap', // Allow wrapping on smaller screens
    gap: 16, // Space between action links
    marginTop: 8, // Separate links from the body copy
  },
  // Primary link styling directing users to login
  successPrimaryAction: {
    color: '#c4b5fd', // Lavender text to match CTAs
    fontWeight: '700', // Bold weight to emphasize primary action
    fontSize: 16, // Comfortable link size
  },
  // Secondary link styling back to home
  successSecondaryAction: {
    color: '#38bdf8', // Cyan color differentiating the secondary link
    fontWeight: '600', // Semi-bold weight for readability
    fontSize: 15, // Slightly smaller to differentiate from primary link
  },
});

// Props describing the password field component contract
type PasswordFieldProps = {
  label: string; // Display name for the password field
  value: string; // Controlled value representing the input's content
  onChange: (next: string) => void; // Change handler wired to the input
  show: boolean; // Flag indicating whether the password is visible
  onToggleShow: () => void; // Handler to flip the visibility state
};

// Shared password input component to keep the form DRY and consistent
function PasswordField({ label, value, onChange, show, onToggleShow }: PasswordFieldProps) {
  return (
    <View style={styles.inputGroup}>
      {/* Label describing this password field */}
      <Text style={styles.label}>{label}</Text>
      {/* Row containing the text field and visibility toggle */}
      <View style={styles.inputRow}>
        {/* Controlled password text input */}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Enter a strong password"
          placeholderTextColor="#475569"
          secureTextEntry={!show}
          style={styles.inputField}
          autoCapitalize="none"
        />
        {/* Button toggling between obscured and visible password modes */}
        <TouchableOpacity onPress={onToggleShow}>
          <Feather name={show ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Props supplied to the validation status indicator component
type ValidationStatusProps = { passed: boolean; text: string };

// Component that displays a pass/fail icon alongside explanatory text
function ValidationStatus({ passed, text }: ValidationStatusProps) {
  return (
    <View style={styles.validationRow}>
      {/* Icon conveys whether the requirement is satisfied */}
      <Feather
        name={passed ? 'check-circle' : 'circle'}
        size={16}
        color={passed ? '#22c55e' : '#475569'}
      />
      {/* Text label describing the requirement itself */}
      <Text style={[styles.validationText, passed && styles.validationTextPassed]}>{text}</Text>
    </View>
  );
}