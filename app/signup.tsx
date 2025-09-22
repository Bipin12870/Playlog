import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  return (
    <View style={styles.container}>
      <Link href="/(tabs)/home" style={styles.homeLink}>
        <Ionicons name="arrow-back" size={20} color="#8b5cf6" />
        <Text style={styles.homeLinkText}>Home</Text>
      </Link>

      <View style={styles.panel}>
        <Text style={styles.kicker}>Ready Player One?</Text>
        <Text style={styles.title}>Create your Playlog account</Text>
        <Text style={styles.subtitle}>
          Lock in your gamer tag, track your sessions, and squad up with friends.
        </Text>

        <View style={styles.buttonStack}>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <Ionicons name="mail" size={18} color="#0f172a" />
            <Text style={styles.primaryButtonText}>Sign up with email</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <Ionicons name="call" size={18} color="#8b5cf6" />
            <Text style={styles.secondaryButtonText}>Continue with phone</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <Ionicons name="logo-google" size={18} color="#8b5cf6" />
            <Text style={styles.secondaryButtonText}>Continue with Google</Text>
          </Pressable>
        </View>

        <Text style={styles.footerHint}>Multiverse authentication coming soon.</Text>
        <View style={styles.altRouteRow}>
          <Text style={styles.altRouteText}>Already have a profile?</Text>
          <Link href="/login" style={styles.altRouteLink}>
            Log in
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#020617',
    gap: 24,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  homeLinkText: { color: '#8b5cf6', fontSize: 16, fontWeight: '600' },
  panel: {
    flex: 1,
    borderRadius: 24,
    padding: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    gap: 24,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  kicker: { color: '#38bdf8', fontSize: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 16, color: '#cbd5f5', lineHeight: 22 },
  buttonStack: { gap: 16 },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#c4b5fd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#e0e7ff' },
  buttonPressed: { opacity: 0.75 },
  footerHint: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  altRouteRow: {
    marginTop: -8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  altRouteText: { color: '#94a3b8', fontSize: 14 },
  altRouteLink: { color: '#c4b5fd', fontSize: 14, fontWeight: '600' },
});
