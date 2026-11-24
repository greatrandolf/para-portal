import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: spacing.xs,
    gap: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
    boxShadow: elevation.md,
  },
  trackWhite: { backgroundColor: colors.surfaceContainerLow, boxShadow: 'none', flexWrap: 'wrap' },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutterSm,
    paddingVertical: 7,
    borderRadius: radius.md,
    minHeight: 32,
  },
  selectedBrand: { backgroundColor: colors.primaryContainer, boxShadow: elevation.brandGlow },
  selectedWhite: { backgroundColor: colors.surfaceContainerLowest, boxShadow: elevation.sm },
  hover: { backgroundColor: colors.surfaceContainer },
  count: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  countSelected: { backgroundColor: colors.primaryContainer },
});
