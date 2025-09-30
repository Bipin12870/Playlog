import { StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#020617',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 24,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  homeLinkText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    borderRadius: 24,
    padding: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.3)',
    justifyContent: 'flex-start',
    gap: 24,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  kicker: {
    color: '#38bdf8',
    fontSize: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5f5',
    lineHeight: 22,
  },
  buttonStack: {
    gap: 16,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#38bdf8',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonActive: {
    shadowColor: '#38bdf8',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  placeholderCard: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  footerHint: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  altRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  altRouteText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  altRouteLink: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 18,
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 16,
  },
  formGrid: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    color: '#f1f5f9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    height: 50,
    color: '#f1f5f9',
  },
  submitButton: {
    marginTop: 8,
  },
  submitDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  primaryButtonTextDisabled: {
    color: '#475569',
  },
  errorBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  errorText: {
    color: '#fecaca',
    flex: 1,
    fontSize: 13,
  },
  infoBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.35)',
  },
  infoText: {
    color: '#bae6fd',
    flex: 1,
    fontSize: 13,
  },
  resendButton: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  forgotRow: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  forgotText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    color: '#64748b',
    fontSize: 13,
  },
  validationTextPassed: {
    color: '#22c55e',
  },
});

export type LoginStyles = typeof loginStyles;
