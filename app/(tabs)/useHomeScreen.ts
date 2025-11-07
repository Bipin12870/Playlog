import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

type Sizes = {
  MAX_WIDTH: number;
  SHELL_PADDING: number;
  contentW: number;
  isSM: boolean;
  isMD: boolean;
  isLG: boolean;
  isXL: boolean;
  heroH: number;
  sideW: number;
  ITEM_WIDTH: number;
  ITEM_GAP: number;
};

export function useHomeScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const MAX_WIDTH = isWeb ? 1320 : width;
  const SHELL_PADDING = isWeb ? (width >= 1200 ? 24 : 16) : 12;

  const contentW = Math.min(width, MAX_WIDTH) - SHELL_PADDING * 2;
  const isXL = contentW >= 1200;
  const isLG = contentW >= 992 && contentW < 1200;
  const isMD = contentW >= 768 && contentW < 992;
  const isSM = contentW < 768;

  const heroH = clamp(Math.round(contentW * (isWeb ? 0.33 : 0.42)), isWeb ? 260 : 180, isWeb ? 420 : 260);
  const sideW = clamp(Math.round(heroH * (isWeb ? 0.45 : 0.0)), 120, isWeb ? 200 : 0);

  const ITEM_GAP = isWeb ? 18 : 12;
  const ITEM_WIDTH = isWeb
    ? clamp(Math.round(contentW * (isXL ? 0.25 : isLG ? 0.28 : isMD ? 0.34 : 0.62)), 220, 360)
    : clamp(Math.round(width * 0.76), 220, 360);

  const placeholderCount = isWeb ? 12 : 10;
  const placeholders = useMemo(() => Array.from({ length: placeholderCount }), [placeholderCount]);

  const sizes: Sizes = {
    MAX_WIDTH,
    SHELL_PADDING,
    contentW,
    isSM,
    isMD,
    isLG,
    isXL,
    heroH,
    sideW,
    ITEM_WIDTH,
    ITEM_GAP,
  };

  const sections = ['Featured Games', 'AI Recommended Game'];

  return { sizes, placeholders, sections, isWeb };
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}
