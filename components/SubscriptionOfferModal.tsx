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
  const managePlanId = billingPlans.find((plan) => plan.highlight)?.id ?? null;

  const handleSelectPlan = (planId: PlanId) => {
    if (onSelectPlan) onSelectPlan(planId);
    else onClose();
  };

  const handleManagePlan = () => {
    if (managePlanId) handleSelectPlan(managePlanId);
  };

  const headerCopy = premium
    ? 'You already have premium access'
    : 'Choose a plan that unlocks everything';

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
        />

        <View style={styles.card}>
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>

          <Text style={styles.heading}>{headerCopy}</Text>

          {/* Premium Perks */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Premium perks</Text>
            <View style={styles.features}>
              {FEATURES.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Only show plans if user is NOT premium */}
          {!premium && (
            <View style={styles.planList}>
              {billingPlans.map((plan) => {
                const active = loadingPlanId === plan.id;

                return (
                  <Pressable
                    key={plan.id}
                    style={({ pressed }) => [
                      styles.planCard,
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

                    {active && (
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 12 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            {/* Only show Maybe Later for NON premium */}
            {!premium && (
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
            )}

            {/* Manage Plan ONLY for premium */}
            {premium && managePlanId && (
              <Pressable
                style={({ pressed }) => [
                  styles.manageAction,
                  pressed && styles.manageActionPressed,
                ]}
                onPress={handleManagePlan}
                accessibilityRole="button"
              >
                {loadingPlanId === managePlanId ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.manageLabel}>Manage plan</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    gap: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    zIndex: 20,
  },
  heading: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  featuresCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  features: { gap: 12 },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
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

  planList: { gap: 12 },

  planCard: {
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  planCardPressed: { opacity: 0.9 },
  planTitle: {
    color: '#e0e7ff',
    fontSize: 16,
    fontWeight: '700',
  },
  planPrice: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  planCycle: { color: '#cbd5f5', fontSize: 12 },
  planDescription: { color: '#cbd5f5', fontSize: 13, marginTop: 4 },

  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    textAlign: 'center',
  },

  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryAction: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.6)',
    backgroundColor: 'rgba(71, 85, 105, 0.08)',
  },
  secondaryActionPressed: { opacity: 0.6 },
  secondaryLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },

  manageAction: {
    minWidth: 130,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageActionPressed: { opacity: 0.85 },
  manageLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});