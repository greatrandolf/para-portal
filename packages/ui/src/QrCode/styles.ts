import { StyleSheet } from 'react-native';

import { colors } from '../theme';

export const styles = StyleSheet.create({
  // Dark on white in every theme: scanners need the contrast.
  frame: { backgroundColor: colors.surfaceContainerLowest, position: 'relative', overflow: 'hidden' },
});
