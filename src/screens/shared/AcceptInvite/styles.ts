import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  pagePhone: { padding: spacing.md },
  card: { width: '100%', maxWidth: 460, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { gap: spacing.xs },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.gutterSm,
    borderRadius: radius.lg,
    backgroundColor: colors.telemetryTint,
    borderWidth: 1,
    borderColor: colors.telemetryBorder,
  },
  inviteText: { flex: 1, minWidth: 0, gap: 2 },
  form: { gap: spacing.md },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
  },
  messageText: { flex: 1 },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  hint: { textAlign: 'center' },
});
