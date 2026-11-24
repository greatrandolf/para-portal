import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  wrapOpen: { zIndex: 50 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceContainerLowest,
  },
  triggerHover: { borderColor: colors.outline },
  label: { flexShrink: 1 },
  menu: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: '100%',
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    boxShadow: elevation.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.gutterSm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.neonOrangeSubtle },
});
