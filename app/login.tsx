import { useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Feather, Ionicons } from '@expo/vector-icons';

import { EmailLogin } from '../components/auth/login/EmailLogin';
import { GoogleLogin } from '../components/auth/login/GoogleLogin';
import { PhoneLogin } from '../components/auth/login/PhoneLogin';
import { loginStyles as styles } from '../components/auth/login/styles';
import { SubscriptionOfferModal } from '../components/SubscriptionOfferModal';

WebBrowser.maybeCompleteAuthSession();

const BACKDROP = require('../assets/glare.png');
const RUNNER = require('../assets/characters.png');
const LOGO = require('../assets/logo.png');

type Method = 'none' | 'google' | 'phone' | 'email';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [method, setMethod] = useState<Method>('email');
  const [showSubscriptionOffer, setShowSubscriptionOffer] = useState(true);
  const pick = (next: Method) => setMethod((prev) => (prev === next ? 'none' : next));

  const MethodPill = ({
    label,
    icon,
    value,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    value: Method;
  }) => {
    const active = method === value;
    return (
      <Pressable onPress={() => pick(value)} style={[styles.methodBtn, active && styles.methodBtnActive]}>
        <Ionicons name={icon} size={18} color={active ? '#0f172a' : '#8b5cf6'} />
        <Text style={active ? styles.methodTextActive : styles.methodText}>{label}</Text>
        <Ionicons
          name={active ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={active ? '#0f172a' : '#94a3b8'}
          style={styles.methodChevron}
        />
      </Pressable>
    );
  };

  const renderAccordion = () => (
    <View style={styles.accordionStack}>
      <Text style={styles.stepLabel}>Log in with</Text>
      <View style={styles.accordionBlock}>
        <MethodPill label="Email" icon="mail" value="email" />
        {method === 'email' && <EmailLogin />}
      </View>
      <View style={styles.accordionBlock}>
        <MethodPill label="Google" icon="logo-google" value="google" />
        {method === 'google' && <GoogleLogin />}
      </View>
      <View style={styles.accordionBlock}>
        <MethodPill label="Phone" icon="call" value="phone" />
        {method === 'phone' && <PhoneLogin />}
      </View>
    </View>
  );

  const renderDesktopCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Welcome back</Text>
      <Text style={styles.cardSubtitle}>Log in to your Playlog account</Text>
      {renderAccordion()}

      <Text style={styles.footerHint}>Need an account? Sign up to start tracking your games.</Text>

      <View style={styles.altRouteRow}>
        <Text style={styles.altRouteText}>Don’t have an account?</Text>
        <Link href="/signup" style={styles.altRouteLink}>
          Sign up
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
          <Pressable style={styles.mobileCloseBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color="#e2e8f0" />
          </Pressable>
        </Link>
      </View>

      <Text style={styles.mobileTagline}>You are one login away.</Text>

      <View style={styles.mobilePanel}>
        <View style={styles.mobilePanelHeader}>
          <Image source={RUNNER} style={styles.mobileCharactersImg} resizeMode="contain" />
        </View>
        {renderAccordion()}

        <View style={styles.mobileFooterTextBlock}>
          <Text style={styles.mobileFooterText}>Forgot your password?</Text>
          <View style={styles.altRouteRow}>
            <Text style={styles.altRouteText}>Don’t have an account?</Text>
            <Link href="/signup" style={styles.altRouteLink}>
              Sign up
            </Link>
          </View>
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
            {/* LEFT HERO PANEL */}
            <View
              style={[
                styles.leftPane,
                wide ? styles.leftPaneWide : styles.leftPaneNarrow,
                wide && styles.leftPaneStatic,
              ]}
            >
              <ImageBackground style={styles.leftBackground} imageStyle={styles.leftBackgroundImage}>
                <View style={styles.leftOverlay} />
                <View style={styles.leftContent}>
                  {/* CLICKABLE LOGO */}
                  <Link href="/(tabs)/home" asChild>
                    <Pressable style={styles.brandRow}>
                      <Image source={LOGO} style={styles.logoImg} />
                      <View>
                        <Text style={styles.brand}>Playlog</Text>
                        <Text style={styles.brandSub}>Track. Discover. Play.</Text>
                      </View>
                    </Pressable>
                  </Link>

                  {/* TAGLINE ABOVE CHARACTER */}
                  <View style={styles.leftCopy}>
                    <Text style={styles.tagline}>You are one login away.</Text>
                  </View>

                  {/* CHARACTER IMAGE */}
                  <Image source={RUNNER} style={styles.charactersImg} resizeMode="contain" />
                </View>
              </ImageBackground>
            </View>

            {/* RIGHT LOGIN FORM */}
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
