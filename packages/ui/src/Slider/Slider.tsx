import { useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors } from '../theme';
import { styles, THUMB } from './styles';

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
  accessibilityLabel: string;
  testID?: string;
};

/** Minimal dependency-free slider: tap or drag on the track; screen-reader increment/decrement. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = colors.telemetry,
  accessibilityLabel,
  testID,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const ratio = (value - min) / (max - min);

  const update = (event: GestureResponderEvent) => {
    if (!width) return;
    const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
    const raw = min + (x / width) * (max - min);
    const next = Math.round(raw / step) * step;
    if (next !== value) onChange(Math.max(min, Math.min(max, next)));
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
        onChange(Math.max(min, Math.min(max, value + delta)));
      }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={update}
      onResponderMove={update}
      style={styles.hitArea}>
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: Math.max(0, ratio * width - THUMB / 2), backgroundColor: color }]}
      />
    </View>
  );
}
