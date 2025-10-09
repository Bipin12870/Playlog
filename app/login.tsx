import { useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { loginStyles as styles } from './login/styles';

const BACKDROP = require('../assets/glare.png');
const RUNNER = require('../assets/characters.png');
const LOGO = require('../assets/logo.png');
const MARIO = require('../assets/mario.png');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: add your actual login logic later

  };

  const handleGoogleLogin = () => {

  };
  const handlePhoneLogin = () => {

  };

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

            <View style={styles.formGrid}>
              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Login Button */}
              <Pressable style={styles.primaryButton} onPress={handleLogin}>
                <Text style={styles.primaryButtonText}>Log In</Text>
              </Pressable>

              {/* Google Login */}
              <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
              <Pressable style={styles.googleButton} onPress={handlePhoneLogin}>
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Login Using Mobile Number</Text>
              </Pressable>
            </View>

            {/* Footer */}
            <Text style={styles.footerHint}>Forgot your password?</Text>

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
