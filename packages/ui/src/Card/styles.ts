import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, boxShadow: elevation.sm },
  elevated: { boxShadow: elevation.md },
  none: { padding: 0 },
  sm: { padding: spacing.gutterSm },
  md: { padding: spacing.md },
  lg: { padding: spacing.lg },
});
