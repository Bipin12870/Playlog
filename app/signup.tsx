import { useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Feather, Ionicons } from '@expo/vector-icons';

import { EmailSignup } from './signup/EmailSignup';
import { GoogleSignup } from './signup/GoogleSignup';
import { PhoneSignup } from './signup/PhoneSignup';
import { signupStyles as styles } from './signup/styles';

WebBrowser.maybeCompleteAuthSession();

const BACKDROP = require('../assets/glare.png');
const LOGO = require('../assets/logo.png');
const RUNNER = require('../assets/runners.png');
const MARIO = require('../assets/mario.png');

type Method = 'none' | 'google' | 'phone' | 'email';

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [method, setMethod] = useState<Method>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const pick = (next: Method) => {
    setErrorMessage(null);
    setVerificationError(null);
    setMethod((prev) => (prev === next ? 'none' : next));
  };

  const handleEmailSuccess = ({
    email,
    verificationError: nextVerificationError,
  }: {
    email: string;
    verificationError?: string | null;
  }) => {
    setVerificationSent(true);
    setSentEmail(email);
    setVerificationError(nextVerificationError ?? null);
    setMethod('none');
  };

  const handlePhoneSuccess = ({ contact }: { contact: string }) => {
    setVerificationSent(true);
    setSentEmail(contact);
    setVerificationError(null);
    setMethod('none');
  };

  return (
    <ImageBackground source={BACKDROP} style={styles.background} imageStyle={styles.backgroundImage}>
      <View style={styles.scrim} />
      <ScrollView
        contentContainerStyle={[styles.shell, wide && styles.shellWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.leftPane, wide ? styles.leftPaneWide : styles.leftPaneNarrow, wide && styles.leftPaneStatic]}
        >
          <ImageBackground source={RUNNER} style={styles.leftBackground} imageStyle={styles.leftBackgroundImage}>
            <View style={styles.leftOverlay} />
            <View style={styles.leftContent}>
            <Link href="/(tabs)/home" asChild>
  <Pressable style={styles.brandRow}>
    <Image source={LOGO} style={styles.logoImg} />
    <View>
      <Text style={styles.brand}>Playlog</Text>
      <Text style={styles.brandSub}>Track. Discover. Play.</Text>
    </View>
  </Pressable>
</Link>
              <View style={styles.leftCopy}>
                <Text style={styles.tagline}>
                  Enjoy top-rated games{"\n"}no payment, just a free account.
                </Text>
                <Text style={styles.subTagline}>
                  Stack your wishlist, jot quick reviews, and keep every search at your fingertips.
                </Text>
                <Text style={styles.quote}>“Keep your library ready before the next drop.”</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.rightPane}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome</Text>
            <Text style={styles.cardSubtitle}>Create your Playlog account</Text>

            {verificationSent ? (
              <View style={styles.successCard}>
                <Feather name="check-circle" size={28} color="#34d399" />
                <Text style={styles.successTitle}>Almost there</Text>
                <Text style={styles.successCopy}>
                  We sent a verification message to {sentEmail}. Confirm it within the next 24 hours to finish
                  creating your account.
                </Text>
                {verificationError ? (
                  <Text style={styles.successWarn}>{verificationError}</Text>
                ) : (
                  <Text style={styles.successWarn}>
                    Didn’t see it? Check spam and promotions, or request another email from the login screen.
                  </Text>
                )}
                <View style={styles.successActions}>
                  <Link href="/login" style={styles.primaryLink}>
                    Log in
                  </Link>
                  <Link href="/(tabs)/home" style={styles.secondaryLink}>
                    Back to home
                  </Link>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.stepLabel}>Choose how you’d like to sign up</Text>
                <View style={styles.methodRow}>
                  <Pressable
                    onPress={() => pick('google')}
                    style={[styles.methodBtn, method === 'google' && styles.methodBtnActive]}
                  >
                    <Ionicons
                      name="logo-google"
                      size={18}
                      color={method === 'google' ? '#0f172a' : '#8b5cf6'}
                    />
                    <Text style={method === 'google' ? styles.methodTextActive : styles.methodText}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => pick('phone')}
                    style={[styles.methodBtn, method === 'phone' && styles.methodBtnActive]}
                  >
                    <Ionicons name="call" size={18} color={method === 'phone' ? '#0f172a' : '#8b5cf6'} />
                    <Text style={method === 'phone' ? styles.methodTextActive : styles.methodText}>
                      Continue with phone
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => pick('email')}
                    style={[styles.methodBtn, method === 'email' && styles.methodBtnActive]}
                  >
                    <Ionicons name="mail" size={18} color={method === 'email' ? '#0f172a' : '#8b5cf6'} />
                    <Text style={method === 'email' ? styles.methodTextActive : styles.methodText}>
                      Continue with email
                    </Text>
                  </Pressable>
                </View>

                {method === 'google' && (
                  <GoogleSignup onError={setErrorMessage} onVerificationError={setVerificationError} />
                )}

                {method === 'phone' && (
                  <PhoneSignup
                    onError={setErrorMessage}
                    onVerificationError={setVerificationError}
                    onSuccess={handlePhoneSuccess}
                  />
                )}

                {method === 'email' && (
                  <EmailSignup onError={setErrorMessage} onSuccess={handleEmailSuccess} />
                )}

                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Feather name="alert-triangle" size={16} color="#f87171" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}


                <View style={styles.altRouteRow}>
                  <Text style={styles.altRouteText}>Already have a profile?</Text>
                  <Link href="/login" style={styles.altRouteLink}>
                    Log in
                  </Link>
                </View>
              </>
            )}

            <Image source={MARIO} style={styles.hero} resizeMode="contain" />
            <View style={styles.glossBox} />
          </View>
        </View>

       
      </ScrollView>
    </ImageBackground>
  );
}

