import { StyleSheet } from 'react-native';

import { colors, radius } from '../theme';

export const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: colors.surfaceContainer, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
