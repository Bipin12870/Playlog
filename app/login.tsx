import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmailLogin } from './login/EmailLogin';
import { GoogleLogin } from './login/GoogleLogin';
import { PhoneLogin } from './login/PhoneLogin';
import { loginStyles as styles } from './login/styles';

type Method = 'none' | 'email' | 'phone' | 'google';

export default function LoginScreen() {
  const [method, setMethod] = useState<Method>('none');

  const pick = (next: Method) => {
    setMethod((prev) => (prev === next ? 'none' : next));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Link href="/(tabs)/home" style={styles.homeLink}>
          <Ionicons name="arrow-back" size={20} color="#38bdf8" />
          <Text style={styles.homeLinkText}>Home</Text>
        </Link>

        <View style={styles.panel}>
          <Text style={styles.kicker}>Welcome back</Text>
          <Text style={styles.title}>Log in to your dashboard</Text>
          <Text style={styles.subtitle}>
            Track the games you follow, manage reviews, and stay on top of search results.
          </Text>

          <View style={styles.buttonStack}>
            <Pressable
              onPress={() => pick('email')}
              style={({ pressed }) => [
                method === 'email' ? styles.primaryButton : styles.secondaryButton,
                method === 'email' && styles.primaryButtonActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="mail-open"
                size={18}
                color={method === 'email' ? '#0f172a' : '#38bdf8'}
              />
              <Text
                style={method === 'email' ? styles.primaryButtonText : styles.secondaryButtonText}
              >
                {method === 'email' ? 'Email login selected' : 'Log in with email'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => pick('phone')}
              style={({ pressed }) => [
                method === 'phone' ? styles.primaryButton : styles.secondaryButton,
                method === 'phone' && styles.primaryButtonActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="call" size={18} color={method === 'phone' ? '#0f172a' : '#38bdf8'} />
              <Text
                style={method === 'phone' ? styles.primaryButtonText : styles.secondaryButtonText}
              >
                {method === 'phone' ? 'Phone login selected' : 'Continue with phone'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => pick('google')}
              style={({ pressed }) => [
                method === 'google' ? styles.primaryButton : styles.secondaryButton,
                method === 'google' && styles.primaryButtonActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="logo-google"
                size={18}
                color={method === 'google' ? '#0f172a' : '#38bdf8'}
              />
              <Text
                style={method === 'google' ? styles.primaryButtonText : styles.secondaryButtonText}
              >
                {method === 'google' ? 'Google login selected' : 'Continue with Google'}
              </Text>
            </Pressable>
          </View>

          {method === 'email' && <EmailLogin />}

          {method === 'phone' && <PhoneLogin />}

          {method === 'google' && <GoogleLogin />}

          {method === 'none' && (
            <View style={styles.placeholderCard}>
              <Ionicons name="options-outline" size={22} color="#38bdf8" />
              <Text style={styles.placeholderText}>Choose a login method to continue.</Text>
            </View>
          )}

          <Text style={styles.footerHint}>More sign-in options are on the way.</Text>
          <View style={styles.altRouteRow}>
            <Text style={styles.altRouteText}>New to Playlog?</Text>
            <Link href="/signup" style={styles.altRouteLink}>
              Sign up
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
