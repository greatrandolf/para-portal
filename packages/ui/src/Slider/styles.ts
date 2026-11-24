import { StyleSheet } from 'react-native';

import { colors, elevation, radius } from '../theme';

export const THUMB = 18;

export const styles = StyleSheet.create({
  hitArea: { height: 28, justifyContent: 'center', cursor: 'pointer' },
  track: { height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceVariant, overflow: 'hidden' },
  fill: { height: '100%' },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.surfaceContainerLowest,
    boxShadow: elevation.md,
  },
});
