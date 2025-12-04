import { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Feather, Ionicons } from '@expo/vector-icons';

import { EmailLogin } from '../components/auth/login/EmailLogin';
import { GoogleLogin } from '../components/auth/login/GoogleLogin';
import { PhoneLogin } from '../components/auth/login/PhoneLogin';
import { createLoginStyles } from '../components/auth/login/styles';
import { SubscriptionOfferModal } from '../components/SubscriptionOfferModal';
import { useTheme } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

const BACKDROP = require('../assets/glare.png');
const HERO_BACKGROUND = require('../assets/blue-bg.jpg');
const RUNNER = require('../assets/characters.png');
const LOGO = require('../assets/logo.png');

type Method = 'none' | 'google' | 'phone' | 'email';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { colors, isDark, statusBarStyle } = useTheme();
  const styles = useMemo(() => createLoginStyles(colors, isDark), [colors, isDark]);

  const [method, setMethod] = useState<Method>(wide ? 'email' : 'none');
  const [showSubscriptionOffer, setShowSubscriptionOffer] = useState(true);
  const pick = (next: Method) => setMethod((prev) => (prev === next ? 'none' : next));
  const accentColor = colors.accent;
  const onAccentColor = isDark ? colors.text : '#0f172a';
  const muted = colors.muted;

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
      <Pressable
        onPress={() => pick(value)}
        style={[styles.methodBtn, active && styles.methodBtnActive]}
        accessibilityRole="button"
        accessibilityLabel={`Log in with ${label}`}
        accessibilityHint={active ? `Collapse ${label} form` : `Expand ${label} form`}
        accessibilityState={{ selected: active, expanded: active }}
        hitSlop={10}
      >
        <Ionicons name={icon} size={18} color={active ? onAccentColor : accentColor} />
        <Text style={active ? styles.methodTextActive : styles.methodText}>{label}</Text>
        <Ionicons
          name={active ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={active ? onAccentColor : muted}
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
        <MethodPill label="Phone" icon="call" value="phone" />
        {method === 'phone' && <PhoneLogin />}
      </View>
      {wide ? (
        <View style={styles.accordionBlock}>
          <MethodPill label="Google" icon="logo-google" value="google" />
          {method === 'google' && <GoogleLogin />}
        </View>
      ) : (
        <View style={styles.accordionBlock}>
          <GoogleLogin variant="inline" />
        </View>
      )}
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
          <Pressable
            style={styles.mobileCloseBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close login and go back"
          >
            <Ionicons name="close" size={18} color={muted} />
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

  const content = (
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
            <ImageBackground
              source={HERO_BACKGROUND}
              style={styles.leftBackground}
              imageStyle={styles.leftBackgroundImage}
            >
              <View style={styles.leftOverlay} />
              <View style={styles.leftContent}>
                {/* CLICKABLE LOGO */}
                <Link href="/(tabs)/home" asChild>
                  <Pressable style={styles.brandRow} accessibilityRole="link" accessibilityLabel="Go back home">
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
  );

  return (
    <>
      <SubscriptionOfferModal
        visible={showSubscriptionOffer}
        onClose={() => setShowSubscriptionOffer(false)}
      />
      <StatusBar barStyle={statusBarStyle} />
      {wide ? (
        <ImageBackground source={BACKDROP} style={styles.background} imageStyle={styles.backgroundImage}>
          <View style={styles.scrim} />
          {content}
        </ImageBackground>
      ) : (
        <SafeAreaView style={[styles.background, styles.mobileFullBackground]}>{content}</SafeAreaView>
      )}
    </>
  );
}
