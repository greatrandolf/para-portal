import { View } from 'react-native';

import { colors } from '../theme';
import { styles } from './styles';

export type ProgressBarProps = {
  /** 0..1 */
  value: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ value, color = colors.telemetry, height = 6 }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}
