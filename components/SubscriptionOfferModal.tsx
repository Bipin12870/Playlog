import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type SubscriptionOfferModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPlan?: () => void;
};

const FEATURES = [
  'Unlimited favourite games',
  'Access to social features',
  'Unlimited reviews access',
  'AI recommended games',
];

export function SubscriptionOfferModal({ visible, onClose, onSelectPlan }: SubscriptionOfferModalProps) {
  const handleSelectPlan = () => {
    if (onSelectPlan) {
      onSelectPlan();
    } else {
      onClose();
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.heading}>
            <Text style={styles.price}>$4.99</Text>
            <Text style={styles.period}> per month</Text>
          </Text>
          <View style={styles.divider} />
          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={handleSelectPlan}
            accessibilityRole="button"
          >
            <Text style={styles.primaryLabel}>Select Plan</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryLabel}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  heading: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
  },
  price: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  period: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: '#0f172a',
    opacity: 0.9,
  },
  primaryLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryAction: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryActionPressed: {
    opacity: 0.6,
  },
  secondaryLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
