import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { maxWidth: 480, width: '100%', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neonOrangeSubtle,
    marginBottom: spacing.xs,
  },
});
