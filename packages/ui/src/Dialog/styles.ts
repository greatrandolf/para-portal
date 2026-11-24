import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  dismiss: { ...StyleSheet.absoluteFill },
  panel: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    boxShadow: elevation.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: spacing.xs },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
});
