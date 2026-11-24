import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutterSm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.lg,
    boxShadow: elevation.lg,
  },
  floating: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    left: spacing.lg,
    maxWidth: 440,
    marginLeft: 'auto',
    zIndex: 100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  body: { flex: 1, gap: 2 },
});

export const toneBg = {
  success: colors.tertiary,
  info: colors.onSurface,
  danger: colors.error,
} as const;
