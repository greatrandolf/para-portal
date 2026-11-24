import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  shrinkFlex: { flex: 1, minWidth: 0 },
  footerStart: { marginRight: 'auto' },
  formError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
  },
  formSection: { gap: spacing.sm },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formCell: { flexGrow: 1, flexBasis: 200 },
  formCellSm: { flexGrow: 1, flexBasis: 120 },
  tripCard: {
    gap: spacing.sm,
    padding: spacing.gutterSm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceContainerLow,
  },
});
