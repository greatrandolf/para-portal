import { StyleSheet } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  field: { gap: spacing.xs, minWidth: 0 },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.gutterSm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceContainerLowest,
    fontFamily: fonts.interRegular,
    fontSize: 14,
    color: colors.onSurface,
  },
  inputFocused: { borderColor: colors.brand },
  inputError: { borderColor: colors.error },
  inputDisabled: { backgroundColor: colors.surfaceContainerLow, color: colors.onSurfaceVariant },
});
