import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../AppText';
import { colors } from '../theme';
import { styles } from './styles';
import type { PressState } from '../utils/pressState';

export type Segment<T extends string> = { value: T; label: string; count?: number };

export type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'brand' | 'white';
  style?: StyleProp<ViewStyle>;
};

/** "brand": orange selected pill (map type toggle). "white": raised white tab (queue tabs). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  variant = 'brand',
  style,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, variant === 'white' && styles.trackWhite, style]}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        const selectedText = variant === 'brand' ? colors.onPrimary : colors.onSurface;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.value)}
            style={({ hovered }: PressState) => [
              styles.segment,
              selected && (variant === 'brand' ? styles.selectedBrand : styles.selectedWhite),
              !selected && hovered && styles.hover,
            ]}>
            <AppText
              variant={variant === 'brand' ? 'labelMd' : 'labelLg'}
              bold={selected}
              color={selected ? selectedText : colors.secondary}>
              {segment.label}
            </AppText>
            {segment.count !== undefined ? (
              <View style={[styles.count, selected && variant === 'white' && styles.countSelected]}>
                <AppText
                  variant="labelSm"
                  color={selected && variant === 'white' ? colors.onPrimary : colors.secondary}>
                  {segment.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
