import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { loginStyles as styles } from './styles';

export function PhoneLogin() {
  return (
    <View style={styles.placeholderCard}>
      <Ionicons name="call" size={22} color="#38bdf8" />
      <Text style={styles.placeholderText}>Phone login will live here. Wire up the flow on this screen.</Text>
    </View>
  );
}
