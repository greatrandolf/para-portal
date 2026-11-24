import { StyleSheet } from 'react-native';

import { colors, elevation, radius } from '../theme';

export const styles = StyleSheet.create({
  base: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  card: { backgroundColor: colors.surfaceContainerLowest, boxShadow: elevation.lg },
  hover: { backgroundColor: colors.surfaceContainer },
});
