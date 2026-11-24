import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  square: { borderRadius: radius.sm },
  dot: { width: 6, height: 6, borderRadius: radius.full },
});

export const toneStyles = StyleSheet.create({
  brand: { backgroundColor: colors.primaryContainer },
  brandSubtle: { backgroundColor: colors.neonOrangeSubtle },
  success: { backgroundColor: colors.tertiaryContainer },
  successSubtle: { backgroundColor: colors.tertiaryFixed },
  neutral: { backgroundColor: colors.surfaceContainerHighest },
  info: { backgroundColor: colors.secondaryFixed },
  telemetry: { backgroundColor: colors.telemetryTint, borderWidth: 1, borderColor: colors.telemetryBorder },
  warning: { backgroundColor: colors.errorContainer },
  verified: { backgroundColor: colors.telemetryStrong },
});

export const toneText = {
  brand: colors.onPrimary,
  brandSubtle: colors.neonOrangeDeep,
  success: colors.onTertiary,
  successSubtle: colors.onTertiaryFixed,
  neutral: colors.onSurfaceVariant,
  info: colors.onSecondaryFixed,
  telemetry: colors.telemetryStrong,
  warning: colors.onErrorContainer,
  verified: colors.onPrimary,
} as const;

export const toneDot = {
  brand: colors.onPrimary,
  brandSubtle: colors.primaryContainer,
  success: colors.onTertiary,
  successSubtle: colors.tertiary,
  neutral: colors.secondary,
  info: colors.secondary,
  telemetry: colors.telemetry,
  warning: colors.crimsonAlert,
  verified: colors.onPrimary,
} as const;
