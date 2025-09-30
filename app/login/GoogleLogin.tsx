import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { loginStyles as styles } from './styles';

export function GoogleLogin() {
  return (
    <View style={styles.placeholderCard}>
      <Ionicons name="logo-google" size={22} color="#38bdf8" />
      <Text style={styles.placeholderText}>Google login implementation goes here.</Text>
    </View>
  );
}
