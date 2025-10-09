import { useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Feather, Ionicons } from '@expo/vector-icons';

import { EmailLogin } from './login/EmailLogin';
import { GoogleLogin } from './login/GoogleLogin';
import { PhoneLogin } from './login/PhoneLogin';
import { loginStyles as styles } from './login/styles';

WebBrowser.maybeCompleteAuthSession();

const BACKDROP = require('../assets/glare.png');
const RUNNER = require('../assets/characters.png');
const LOGO = require('../assets/logo.png');
const MARIO = require('../assets/mario.png');

type Method = 'none' | 'google' | 'phone' | 'email';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [method, setMethod] = useState<Method>('email');
  const pick = (next: Method) => setMethod((prev) => (prev === next ? 'none' : next));

  return (
    <ImageBackground source={BACKDROP} style={styles.background} imageStyle={styles.backgroundImage}>
      <View style={styles.scrim} />
      <ScrollView
        contentContainerStyle={[styles.shell, wide && styles.shellWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        <View style={styles.rightPane}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Log in to your Playlog account</Text>

            <Text style={styles.stepLabel}>Choose how you’d like to log in</Text>
            <View style={styles.methodRow}>
              <Pressable
                onPress={() => pick('google')}
                style={[styles.methodBtn, method === 'google' && styles.methodBtnActive]}
              >
                <Ionicons name="logo-google" size={18} color={method === 'google' ? '#0f172a' : '#8b5cf6'} />
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

            {method === 'email' && (
              <View style={styles.placeholderCard}>
                <Feather name="log-in" size={18} color="#cbd5f5" />
                <Text style={styles.placeholderText}>
                  Pick a sign-in method to continue. Email lets you resend verification or reset your password.
                </Text>
              </View>
            )}

            {method === 'google' && <GoogleLogin />}
            {method === 'phone' && <PhoneLogin />}
            {method === 'email' && <EmailLogin />}

            <Text style={styles.footerHint}>Need an account? Sign up to start tracking your games.</Text>

            <View style={styles.altRouteRow}>
              <Text style={styles.altRouteText}>Don’t have an account?</Text>
              <Link href="/signup" style={styles.altRouteLink}>
                Sign up
              </Link>
            </View>

            <Image source={MARIO} style={styles.hero} resizeMode="contain" />
            <View style={styles.glossBox} />
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
