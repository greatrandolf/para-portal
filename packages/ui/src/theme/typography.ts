import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

/** Families as registered by `useFonts(fontAssets)`. Weight lives in the family name. */
export const fonts = {
  interRegular: 'Inter_400Regular',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  jakartaSemiBold: 'PlusJakartaSans_600SemiBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
  jakartaExtraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const fontAssets = {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

/** Stitch `fontSize` table. */
export const typography = {
  displayLg: { fontFamily: fonts.jakartaExtraBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  displaySm: { fontFamily: fonts.jakartaBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
  metricDisplay: { fontFamily: fonts.jakartaExtraBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.84 },
  headlineLg: { fontFamily: fonts.jakartaBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  headlineSm: { fontFamily: fonts.jakartaSemiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  metricTabular: { fontFamily: fonts.interBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.18 },
  bodyLg: { fontFamily: fonts.interRegular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontFamily: fonts.interRegular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySm: { fontFamily: fonts.interRegular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  labelLg: { fontFamily: fonts.interSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  labelMd: { fontFamily: fonts.interSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  labelSm: { fontFamily: fonts.interBold, fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Bold override per variant (Inter variants go to Inter Bold, Jakarta to ExtraBold). */
export const boldFamily: Record<TypographyVariant, string> = {
  displayLg: fonts.jakartaExtraBold,
  displaySm: fonts.jakartaExtraBold,
  metricDisplay: fonts.jakartaExtraBold,
  headlineLg: fonts.jakartaExtraBold,
  headlineSm: fonts.jakartaBold,
  metricTabular: fonts.interBold,
  bodyLg: fonts.interBold,
  bodyMd: fonts.interBold,
  bodySm: fonts.interBold,
  labelLg: fonts.interBold,
  labelMd: fonts.interBold,
  labelSm: fonts.interBold,
};
