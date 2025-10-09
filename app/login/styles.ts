import { StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  /* BACKGROUND */
  background: { flex: 1 },
  backgroundImage: { resizeMode: 'cover' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 9, 20, 0.6)', // same dark veil as signup
  },

  /* LAYOUT */
  shell: { padding: 24, gap: 24, minHeight: '100%', flexGrow: 1 },
  shellWide: { flexDirection: 'row', alignItems: 'stretch' },

  /* LEFT SIDE (hero section) */
  leftPane: {
    flex: 1.2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
    overflow: 'hidden',
  },
  leftPaneWide: { minHeight: 680, maxHeight: 680 },
  leftPaneStatic: { alignSelf: 'flex-start' },
  leftPaneNarrow: { minHeight: 420 },
  leftBackground: {
    flex: 1,
    justifyContent: 'flex-start', // tagline on top
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  leftBackgroundImage: { resizeMode: 'cover', width: '100%', height: '100%' },
  leftOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 14, 26, 0.55)' },
  leftContent: { flex: 1, gap: 20, padding: 28, alignSelf: 'stretch' },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  logoImg: { width: 96, height: 96, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  brand: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  brandSub: { color: '#cbd5f5', fontSize: 12, marginTop: 2, letterSpacing: 1 },

  leftCopy: {
    marginTop: 24,
    alignItems: 'center',
  },
  tagline: {
    color: '#f8fafc',
    fontSize: 35,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily:'PlayfairDisplay_400Regular'
  },

  /* CHARACTER IMAGE BELOW TAGLINE */
  charactersImg: {
    width: '120%',
    height: 500,
    marginTop: 10,
    alignSelf: 'center',
    opacity: 0.9,
  },

  /* RIGHT PANEL (form card) */
  rightPane: { flex: 0.8, minWidth: 320 },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    minHeight: 560,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTitle: { color: '#ffffff', fontSize: 30, fontFamily:'PlayfairDisplay_400Regular', fontWeight: '800', textAlign: 'center' },
  cardSubtitle: { color: '#e2e8f0', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  stepLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  /* METHOD BUTTONS */
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodBtn: {
    flexGrow: 1,
    minWidth: 160,
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
  methodBtnActive: {
    backgroundColor: '#c4b5fd',
    shadowColor: '#c4b5fd',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  methodText: { fontSize: 16, fontWeight: '600', color: '#e0e7ff' },
  methodTextActive: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  /* PLACEHOLDER PANEL */
  placeholderCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(2,6,23,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: { color: '#cbd5f5', fontSize: 14 },

  /* FOOTER + ALT ROUTE */
  footerHint: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 16 },
  altRouteRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  altRouteText: { color: '#94a3b8', fontSize: 14 },
  altRouteLink: { color: '#c4b5fd', fontSize: 14, fontWeight: '600' },

  /* HERO MARIO + GLOSS */
  hero: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 200,
    height: 200,
    opacity: 0.35,
  },
  glossBox: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    pointerEvents: 'none',
  },

  /* SHARED FORM STYLES FOR AUTH FLOWS */
  formCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(2,6,23,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gap: 14,
  },
  formGrid: { gap: 16, marginTop: 18 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#cbd5f5', fontSize: 13, fontWeight: '600' },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    color: '#111827',
  },
  inputRow: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputField: { flex: 1, height: 48, color: '#111827' },
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
  primaryButtonTextDisabled: { color: '#475569' },
  submitButton: { marginTop: 8, alignSelf: 'stretch', width: '100%' },
  submitDisabled: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: '#38bdf8', fontSize: 14, fontWeight: '600' },
  resendButton: { alignSelf: 'flex-start' },
  buttonPressed: { opacity: 0.85 },
  forgotRow: { alignSelf: 'flex-start' },
  forgotText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  errorBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  errorText: { color: '#fecaca', fontSize: 13, flex: 1 },
  infoBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  infoText: { color: '#bae6fd', fontSize: 13, flex: 1 },
  validationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  validationText: { color: '#64748b', fontSize: 13 },
  validationTextPassed: { color: '#22c55e' },

  googleButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
