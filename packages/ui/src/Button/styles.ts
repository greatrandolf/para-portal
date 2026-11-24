import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  lg: { minHeight: 52, paddingHorizontal: spacing.lg },
  fullWidth: { alignSelf: 'stretch' },
  label: { flexShrink: 1, textAlign: 'center' },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.75 },
});

export const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.brand, boxShadow: elevation.ctaGlow },
  secondary: { backgroundColor: colors.surfaceContainerLowest, boxShadow: elevation.sm },
  outline: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.telemetryBorder },
  ghost: { backgroundColor: colors.transparent },
  muted: { backgroundColor: colors.surfaceContainer },
  danger: { backgroundColor: colors.transparent },
  success: { backgroundColor: colors.tertiaryContainer },
});

export const labelColor = {
  primary: colors.onBrand,
  secondary: colors.onSurface,
  outline: colors.onSurface,
  ghost: colors.onSurface,
  muted: colors.onSurface,
  danger: colors.error,
  success: colors.onTertiary,
} as const;
