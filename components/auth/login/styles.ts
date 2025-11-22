import { StyleSheet } from 'react-native';

import type { ThemeColors } from '../../../lib/theme';

export type LoginStyles = ReturnType<typeof createLoginStyles>;

export function createLoginStyles(colors: ThemeColors, isDark: boolean) {
  const surface = colors.surface;
  const surfaceAlt = colors.surfaceSecondary;
  const accent = colors.accent;
  const text = colors.text;
  const muted = colors.muted;
  const border = colors.border;

  return StyleSheet.create({
    /* BACKGROUND */
    background: { flex: 1, backgroundColor: colors.background },
    backgroundImage: { resizeMode: 'cover' },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(6, 9, 20, 0.6)' : 'rgba(255,255,255,0.65)',
    },

    /* LAYOUT */
    shell: { padding: 24, gap: 24, minHeight: '100%', flexGrow: 1 },
    shellWide: { flexDirection: 'row', alignItems: 'stretch' },
    shellNarrow: { paddingVertical: 24, justifyContent: 'center' },

    /* LEFT SIDE (hero section) */
    leftPane: {
      flex: 1.2,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
    },
    leftPaneWide: { minHeight: 680, maxHeight: 680 },
    leftPaneStatic: { alignSelf: 'flex-start' },
    leftPaneNarrow: { minHeight: 420 },
    leftBackground: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 32,
    },
    leftBackgroundImage: { resizeMode: 'cover', width: '100%', height: '100%' },
    leftOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(10, 14, 26, 0.55)' : 'rgba(255,255,255,0.55)',
    },
    leftContent: { flex: 1, gap: 20, padding: 28, alignSelf: 'stretch' },

    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 12,
    },
    logoImg: {
      width: 96,
      height: 96,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: border,
    },
    brand: { color: text, fontSize: 24, fontWeight: '800' },
    brandSub: { color: muted, fontSize: 12, marginTop: 2, letterSpacing: 1 },

    leftCopy: {
      marginTop: 24,
      alignItems: 'center',
    },
    tagline: {
      color: text,
      fontSize: 35,
      lineHeight: 32,
      fontWeight: '700',
      textAlign: 'center',
      fontFamily: 'PlayfairDisplay_400Regular',
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
      borderRadius: 28,
      backgroundColor: surface,
      padding: 28,
      borderWidth: 1,
      borderColor: border,
      minHeight: 560,
      position: 'relative',
      overflow: 'hidden',
    },
    cardTitle: {
      color: text,
      fontSize: 30,
      fontFamily: 'PlayfairDisplay_400Regular',
      fontWeight: '800',
      textAlign: 'center',
    },
    cardSubtitle: { color: muted, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 20 },
    stepLabel: { color: muted, fontSize: 13, fontWeight: '600', marginBottom: 12 },
    cardMobile: {
      borderRadius: 32,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      padding: 22,
      shadowColor: isDark ? '#01030a' : '#000',
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
      minHeight: undefined,
      gap: 12,
    },
    mobileCardWrapper: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 8 },
    mobileBrandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    mobileBrandLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mobileLogoMark: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: border,
    },
    mobileBrand: { color: text, fontSize: 22, fontWeight: '800' },
    mobileBrandMeta: { color: muted, fontSize: 12 },
    mobileCloseBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileTagline: { color: muted, textAlign: 'center', marginBottom: 12, fontSize: 13 },
    mobilePanel: {
      borderRadius: 32,
      borderWidth: 1,
      borderColor: border,
      padding: 20,
      backgroundColor: surfaceAlt,
      gap: 20,
    },
    mobilePanelHeader: { alignItems: 'center', gap: 4 },
    mobileCharactersImg: { width: '90%', height: 140 },
    cardTitleMobile: {
      fontSize: 34,
      textAlign: 'center',
      fontFamily: 'PlayfairDisplay_400Regular',
      color: text,
    },
    cardSubtitleMobile: { fontSize: 15, color: muted, textAlign: 'center', marginBottom: 4 },
    mobileFooterTextBlock: { alignItems: 'center', gap: 6 },
    mobileFooterText: { color: muted, fontSize: 13 },

    /* METHOD BUTTONS */
    accordionStack: { gap: 10 },
    accordionBlock: {
      borderRadius: 20,
      gap: 12,
      padding: 4,
    },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    methodBtn: {
      minHeight: 56,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: border,
      backgroundColor: surfaceAlt,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 20,
    },
    methodBtnActive: {
      backgroundColor: accent,
      borderColor: accent,
      shadowColor: accent,
      shadowOpacity: 0.35,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    methodText: { fontSize: 16, fontWeight: '600', color: text },
    methodTextActive: { fontSize: 16, fontWeight: '700', color: isDark ? '#0f172a' : colors.background },
    methodChevron: { marginLeft: 'auto' },

    /* PLACEHOLDER PANEL */
    placeholderCard: {
      borderRadius: 18,
      padding: 18,
      backgroundColor: surfaceAlt,
      borderWidth: 1,
      borderColor: border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    placeholderText: { color: muted, fontSize: 14 },

    /* FOOTER + ALT ROUTE */
    footerHint: { color: muted, fontSize: 13, textAlign: 'center', marginTop: 16 },
    altRouteRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
    altRouteText: { color: muted, fontSize: 14 },
    altRouteLink: { color: accent, fontSize: 14, fontWeight: '600' },

    /* HERO MARIO + GLOSS */
    glossBox: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: border,
      pointerEvents: 'none',
    },
    mobileGlossBox: { borderRadius: 32, borderColor: border },

    /* SHARED FORM STYLES FOR AUTH FLOWS */
    formCard: {
      marginTop: 18,
      borderRadius: 24,
      padding: 22,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      gap: 16,
    },
    formGrid: { gap: 18, marginTop: 18 },
    inputGroup: { gap: 6 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { color: text, fontSize: 13, fontWeight: '600' },
    input: {
      height: 52,
      borderRadius: 18,
      backgroundColor: surfaceAlt,
      paddingHorizontal: 20,
      color: text,
      borderWidth: 1,
      borderColor: border,
    },
    inputRow: {
      height: 52,
      borderRadius: 18,
      backgroundColor: surfaceAlt,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: border,
    },
    inputField: { flex: 1, height: 52, color: text },
    primaryButton: {
      height: 52,
      borderRadius: 18,
      backgroundColor: accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: isDark ? colors.text : '#0f172a' },
    primaryButtonTextDisabled: { color: muted },
    submitButton: { marginTop: 8, alignSelf: 'stretch', width: '100%' },
    submitDisabled: { backgroundColor: surfaceAlt, borderColor: border },
    secondaryButton: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      flexDirection: 'row',
    },
    secondaryLabel: { color: text, fontSize: 14, fontWeight: '600' },
    helper: { color: muted, fontSize: 12 },
    helperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    helperLink: { color: accent, fontWeight: '700' },
    formError: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    formSuccess: {
      color: colors.success,
      fontSize: 13,
      fontWeight: '600',
    },
    infoBubble: {
      backgroundColor: surfaceAlt,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: border,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    infoBubbleText: { color: text, fontSize: 13, flex: 1 },
    resendButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: accent,
    },
    resendLabel: { color: isDark ? colors.text : '#ffffff', fontWeight: '700' },
  });
}
