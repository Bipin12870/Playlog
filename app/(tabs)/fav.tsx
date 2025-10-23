import { View, Text, StyleSheet } from 'react-native';

export default function FavScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favourites</Text>
      <Text>Your favorite games and lists.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
});