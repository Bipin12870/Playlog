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

import { EmailSignup } from '../components/auth/signup/EmailSignup';
import { GoogleSignup } from '../components/auth/signup/GoogleSignup';
import { PhoneSignup } from '../components/auth/signup/PhoneSignup';
import { signupStyles as styles } from '../components/auth/signup/styles';
import { SubscriptionOfferModal } from '../components/SubscriptionOfferModal';

WebBrowser.maybeCompleteAuthSession();

const BACKDROP = require('../assets/glare.png');
const LOGO = require('../assets/logo.png');
const RUNNER = require('../assets/runners.png');

type Method = 'none' | 'google' | 'phone' | 'email';

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const isMobile = !wide;

  const [method, setMethod] = useState<Method>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showSubscriptionOffer, setShowSubscriptionOffer] = useState(true);

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

  const renderSuccessCard = () => (
    <View style={styles.successCard}>
      <Feather name="check-circle" size={28} color="#34d399" />
      <Text style={styles.successTitle}>Almost there</Text>
      <Text style={styles.successCopy}>
        We sent a verification message to {sentEmail}. Confirm it within the next 24 hours to finish creating your
        account.
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
  );

  const AccordionSection = ({
    value,
    icon,
    label,
    children,
  }: {
    value: Method;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    children: React.ReactNode;
  }) => {
    const active = method === value;
    return (
      <View style={[styles.accordionBlock, active && styles.accordionBlockActive]}>
        <Pressable
          style={styles.accordionHeader}
          onPress={() => pick(value)}
          accessibilityRole="button"
          accessibilityLabel={`${label} sign up`}
          accessibilityHint={active ? `Collapse ${label} form` : `Expand ${label} form`}
          accessibilityState={{ expanded: active, selected: active }}
          hitSlop={10}
        >
          <Ionicons name={icon} size={18} color={active ? '#0f172a' : '#8b5cf6'} />
          <Text style={styles.accordionLabel}>{label}</Text>
          <Ionicons
            name={active ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={active ? '#0f172a' : '#94a3b8'}
            style={styles.methodChevron}
          />
        </Pressable>
        {active && <View style={styles.accordionBody}>{children}</View>}
      </View>
    );
  };

  const renderSignupForm = () => (
    <>
      <Text style={[styles.stepLabel, isMobile && styles.stepLabelMobile]}>Choose how you’d like to sign up</Text>
      <View style={styles.accordionStack}>
        <AccordionSection value="email" icon="mail" label="Email">
          <EmailSignup onError={setErrorMessage} onSuccess={handleEmailSuccess} />
        </AccordionSection>
        <AccordionSection value="google" icon="logo-google" label="Google">
          <GoogleSignup onError={setErrorMessage} onVerificationError={setVerificationError} />
        </AccordionSection>
        <AccordionSection value="phone" icon="call" label="Phone">
          <PhoneSignup
            onError={setErrorMessage}
            onVerificationError={setVerificationError}
            onSuccess={handlePhoneSuccess}
          />
        </AccordionSection>
      </View>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Feather name="alert-triangle" size={16} color="#f87171" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </>
  );

  const renderDesktopCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Welcome</Text>
      <Text style={styles.cardSubtitle}>Create your Playlog account</Text>
      {verificationSent ? renderSuccessCard() : renderSignupForm()}
      <View style={styles.altRouteRow}>
        <Text style={styles.altRouteText}>Already have a profile?</Text>
        <Link href="/login" style={styles.altRouteLink}>
          Log in
        </Link>
      </View>
      <View style={styles.glossBox} />
    </View>
  );

  const renderMobileCard = () => (
    <View style={[styles.card, styles.cardMobile]}>
      <View style={styles.mobileBrandRow}>
        <View style={styles.mobileBrandLeft}>
          <Image source={LOGO} style={styles.mobileLogoMark} />
          <View>
            <Text style={styles.mobileBrand}>Playlog</Text>
            <Text style={styles.mobileBrandMeta}>Track. Discover. Play.</Text>
          </View>
        </View>
        <Link href="/(tabs)/home" asChild>
          <Pressable
            style={styles.mobileCloseBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close sign up and go back"
          >
            <Ionicons name="close" size={18} color="#e2e8f0" />
          </Pressable>
        </Link>
      </View>
      <Text style={styles.mobileTagline}>Create your Playlog account</Text>
      <View style={styles.mobilePanelHeader}>
        <Image source={RUNNER} style={styles.mobileCharactersImg} resizeMode="contain" />
      </View>
      <View style={styles.mobilePanel}>
        {verificationSent ? renderSuccessCard() : renderSignupForm()}
        <View style={styles.mobileFooterTextBlock}>
          <Text style={styles.mobileFooterText}>Already have a profile?</Text>
          <Link href="/login" style={styles.altRouteLink}>
            Log in
          </Link>
        </View>
      </View>
      <View style={[styles.glossBox, styles.mobileGlossBox]} />
    </View>
  );

  return (
    <>
      <SubscriptionOfferModal
        visible={showSubscriptionOffer}
        onClose={() => setShowSubscriptionOffer(false)}
      />
      <ImageBackground source={BACKDROP} style={styles.background} imageStyle={styles.backgroundImage}>
        <View style={styles.scrim} />
        <ScrollView
          contentContainerStyle={[styles.shell, wide ? styles.shellWide : styles.shellNarrow]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {wide ? (
            <>
              <View
                style={[styles.leftPane, wide ? styles.leftPaneWide : styles.leftPaneNarrow, wide && styles.leftPaneStatic]}
              >
                <ImageBackground
                  source={RUNNER}
                  style={styles.leftBackground}
                  imageStyle={styles.leftBackgroundImage}
                >
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

              <View style={styles.rightPane}>{renderDesktopCard()}</View>
            </>
          ) : (
            <View style={styles.mobileCardWrapper}>{renderMobileCard()}</View>
          )}
        </ScrollView>
      </ImageBackground>
    </>
  );
}
