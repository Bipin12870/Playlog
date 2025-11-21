import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { billingPlans, type PlanId } from '../lib/billing';

const FEATURES = [
  'Unlimited favourite games',
  'Access to social features',
  'Unlimited reviews access',
  'AI recommended games',
];

type SubscriptionOfferModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: PlanId) => void;
  loadingPlanId?: PlanId | null;
  errorMessage?: string | null;
  premium?: boolean;
};

export function SubscriptionOfferModal({
  visible,
  onClose,
  onSelectPlan,
  loadingPlanId,
  errorMessage,
  premium,
}: SubscriptionOfferModalProps) {
  const handleSelectPlan = (planId: PlanId) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      onClose();
    }
  };

  const headerCopy = premium
    ? 'You already have premium access'
    : 'Choose a plan that unlocks everything';

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>

          <Text style={styles.heading}>{headerCopy}</Text>

          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planList}>
            {billingPlans.map((plan) => {
              const active = loadingPlanId === plan.id;
              const actionLabel = premium ? 'Manage in Stripe' : 'Select';

              return (
                <Pressable
                  key={plan.id}
                  style={({ pressed }) => [
                    styles.planCard,
                    plan.highlight && styles.planCardFeatured,
                    pressed && styles.planCardPressed,
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planPrice}>{plan.priceLabel}</Text>
                    <Text style={styles.planCycle}>{plan.billingCycle}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                  <View style={styles.planAction}>
                    {active ? (
                      <ActivityIndicator size="small" color="#f8fafc" />
                    ) : (
                      <Text style={styles.planActionLabel}>{actionLabel}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.secondaryActionPressed,
            ]}
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
    maxWidth: 400,
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
    color: '#111827',
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
  planList: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  planCardFeatured: {
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
  },
  planCardPressed: {
    opacity: 0.85,
  },
  planTitle: {
    color: '#e0e7ff',
    fontSize: 16,
    fontWeight: '700',
  },
  planPrice: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  planCycle: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  planDescription: {
    color: '#cbd5f5',
    fontSize: 13,
    marginTop: 4,
  },
  planAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  planActionLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    textAlign: 'center',
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