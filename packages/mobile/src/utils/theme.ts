import { Platform, TextStyle } from 'react-native';
import { COLORS } from './constants';

/**
 * POLLSTICS Civic baseline — design tokens (typography, spacing, radius,
 * shadow). All screens read from here so a token change repaints the app.
 *
 * Fonts: IBM Plex Sans (UI), IBM Plex Sans Devanagari (Hindi), IBM Plex Mono
 * (numbers, codes, EPIC, timestamps). Drop the .ttf files into
 * android/app/src/main/assets/fonts/ and run `npx react-native run-android`.
 * If the .ttf files are missing, RN falls back to the system default — the
 * design still works, just not pixel-perfect on type.
 */
export const FONTS = {
  ui: 'IBMPlexSans-Regular',
  uiMedium: 'IBMPlexSans-Medium',
  uiSemiBold: 'IBMPlexSans-SemiBold',
  uiBold: 'IBMPlexSans-Bold',
  hi: 'IBMPlexSansDevanagari-Regular',
  hiMedium: 'IBMPlexSansDevanagari-Medium',
  hiSemiBold: 'IBMPlexSansDevanagari-SemiBold',
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
  monoSemiBold: 'IBMPlexMono-SemiBold',
  monoBold: 'IBMPlexMono-Bold',
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  '5xl': 24,
};

export const SHADOW = {
  card: Platform.select({
    android: { elevation: 1 },
    default: {
      shadowColor: '#0F1B2D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
  }) as object,
  elevated: Platform.select({
    android: { elevation: 4 },
    default: {
      shadowColor: '#0F1B2D',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
  }) as object,
};

const ui = (weight: '400' | '500' | '600' | '700' | '800'): TextStyle => {
  const family = {
    '400': FONTS.ui,
    '500': FONTS.uiMedium,
    '600': FONTS.uiSemiBold,
    '700': FONTS.uiBold,
    '800': FONTS.uiBold,
  }[weight];
  return { fontFamily: family, fontWeight: weight };
};

const mono = (weight: '400' | '500' | '600' | '700'): TextStyle => {
  const family = {
    '400': FONTS.mono,
    '500': FONTS.monoMedium,
    '600': FONTS.monoSemiBold,
    '700': FONTS.monoBold,
  }[weight];
  return { fontFamily: family, fontWeight: weight };
};

const hi = (weight: '400' | '500' | '600'): TextStyle => {
  const family = {
    '400': FONTS.hi,
    '500': FONTS.hiMedium,
    '600': FONTS.hiSemiBold,
  }[weight];
  return { fontFamily: family, fontWeight: weight };
};

export const TYPE = {
  ui,
  mono,
  hi,
  // Common composed styles
  display: { ...ui('800'), fontSize: 30, letterSpacing: -0.6, lineHeight: 34, color: COLORS.ink },
  h1: { ...ui('800'), fontSize: 22, letterSpacing: -0.4, lineHeight: 28, color: COLORS.ink },
  h2: { ...ui('700'), fontSize: 18, lineHeight: 24, color: COLORS.ink },
  h3: { ...ui('700'), fontSize: 16, lineHeight: 22, color: COLORS.ink },
  body: { ...ui('500'), fontSize: 14, lineHeight: 20, color: COLORS.ink },
  bodySm: { ...ui('500'), fontSize: 13, lineHeight: 18, color: COLORS.ink },
  caption: { ...ui('500'), fontSize: 12, lineHeight: 16, color: COLORS.mutedDeep },
  overline: {
    ...ui('700'),
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 14,
    color: COLORS.muted,
    textTransform: 'uppercase' as const,
  },
  monoNum: { ...mono('700'), color: COLORS.ink },
  hiSm: { ...hi('500'), fontSize: 12, color: COLORS.mutedDeep },
};
